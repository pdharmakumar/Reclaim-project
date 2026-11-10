import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

let mf, db, alice, bob, outsider, itemId, claimId, conversationId;
const origin = 'https://reclaim.test';
const password = 'test-only long password 123';
async function call(path,body,cookie,headers = {}) {
  const response = await mf.dispatchFetch(origin + path,{
    ...(body !== undefined ? { method:'POST', body:JSON.stringify(body) } : {}),
    headers:{ ...(body !== undefined ? {'Content-Type':'application/json',Origin:origin} : {}), ...(cookie ? {Cookie:cookie} : {}), ...headers },
  });
  return { status:response.status, data:await response.json(), cookie:response.headers.get('set-cookie'), headers:response.headers };
}
async function signup(name) {
  const result = await call('/api/auth/signup',{name,email:`${name}@example.test`,password});
  assert.equal(result.status,200,JSON.stringify(result.data));
  return { ...result, cookie:result.cookie.split(';')[0], user:(await call('/api/state',undefined,result.cookie.split(';')[0])).data.user };
}
const action = (account,operation,...args) => call('/api/action',{operation,args},account.cookie);
const item = { title:'Black headphones',description:'Headphones found on the library table with a distinctive sticker.',category:'Electronics',location:'Library',date:'2026-11-01',type:'found',photos:[],color:'Black',brand:'',additional:'' };

before(async () => {
  mf = new Miniflare(convertV4MiniflareOptions({ modules:true, scriptPath:'.worker-test/index.js',compatibilityDate:'2026-11-10',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],serviceBindings:{ ASSETS:() => new Response('static asset') } }));
  db = await mf.getD1Database('DB');
  await db.exec(await readFile('migrations/0001_accounts.sql','utf8'));
  alice = await signup('Alice'); bob = await signup('Bob'); outsider = await signup('Outsider');
});
beforeEach(async () => { await db.prepare('DELETE FROM rate_limits').run(); });
after(async () => { await mf?.dispose(); });

test('sign-up creates a persistent account with hashed credentials and an HttpOnly session',async () => {
  const cookie = alice.headers.get('set-cookie');
  assert.match(cookie,/^__Host-reclaim_session=/); assert.match(cookie,/HttpOnly/); assert.match(cookie,/Secure/); assert.match(cookie,/SameSite=Lax/);
  const row = await db.prepare('SELECT * FROM users WHERE id=?').bind(alice.user.id).first();
  assert.notEqual(row.password_hash,password); assert.match(row.password_hash,/^scrypt:/);
  assert.notEqual(row.recovery_hash,alice.data.recoveryCode);
  const stored = await db.prepare('SELECT token_hash FROM sessions WHERE user_id=?').bind(alice.user.id).first();
  assert.notEqual(stored.token_hash,alice.cookie.split('=')[1]);
  const duplicate = await call('/api/auth/signup',{name:'Another Alice',email:'ALICE@example.test',password});
  assert.equal(duplicate.status,409);
  assert.equal((await call('/api/auth/signup',{name:'Short',email:'short@example.test',password:'short'})).status,400);
  assert.equal((await call('/api/auth/signup',{name:'Seven',email:'seven@example.test',password:'seven77'})).status,400);
  const eight = await call('/api/auth/signup',{name:'Eight',email:'eight@example.test',password:'eight888'});
  assert.equal(eight.status,200,'An eight-character password must be accepted.');
  assert.equal((await call('/api/auth/login',{email:'eight@example.test',password:'eight888'})).status,200);
});

test('anonymous browsing works while mutations and forged identities are rejected',async () => {
  const guest = await call('/api/state');
  assert.equal(guest.status,200); assert.equal(guest.data.user,null); assert.deepEqual(guest.data.claims,[]);
  assert.equal((await call('/api/action',{operation:'createItem',args:[item]})).status,401);
  assert.equal((await action(alice,'switchUser',bob.user.id)).status,400);
  const created = await action(alice,'createItem',{ ...item, creatorId:bob.user.id });
  assert.equal(created.status,200,JSON.stringify(created.data)); itemId = created.data.result;
  assert.equal(created.data.state.items[0].creatorId,alice.user.id);
  assert.equal((await action(bob,'updateItem',itemId,{...item,title:'Stolen edit'})).status,400);
  assert.equal((await action(bob,'deleteItem',itemId)).status,400);
  assert.equal((await action(alice,'createItem',{...item,photos:['data:image/svg+xml;base64,PHN2Zz4=']})).status,400);
  assert.equal((await action(alice,'createItem',{...item,additional:{html:'bad'}})).status,400);
});

test('claims and conversations are shared across sessions and private to participants',async () => {
  const claim = await action(bob,'requestClaim',itemId,'Mine has a small blue sticker hidden under the ear cup.');
  assert.equal(claim.status,200); claimId = claim.data.result;
  conversationId = claim.data.state.claims[0].conversationId;
  const sent = await action(bob,'sendMessage',conversationId,'Hello, I think these are mine.');
  assert.equal(sent.status,200);
  const finder = await call('/api/state',undefined,alice.cookie);
  assert.equal(finder.data.claims.length,1); assert.equal(finder.data.messages[0].senderId,bob.user.id);
  const other = await call('/api/state',undefined,outsider.cookie);
  assert.deepEqual(other.data.claims,[]); assert.deepEqual(other.data.conversations,[]); assert.deepEqual(other.data.messages,[]);
  assert.equal((await action(outsider,'sendMessage',conversationId,'Intrusion')).status,400);
  assert.equal((await action(outsider,'markRead',conversationId)).status,400);
  assert.equal((await action(bob,'changeClaim',claimId,'Under Review')).status,400);
  assert.equal(JSON.stringify(other.data).includes('example.test'),true); // Only its own email may appear.
  assert.equal(JSON.stringify(other.data).includes('Alice@example.test'.toLowerCase()),false);
  assert.equal(JSON.stringify(finder.data).includes('password_hash'),false);
  assert.equal(JSON.stringify(finder.data).includes('recovery_hash'),false);
});

test('concurrent claims cannot both be approved and pickup requires both participants',async () => {
  const second = await action(outsider,'requestClaim',itemId,'I also have a distinctive mark on the headband of these headphones.');
  assert.equal(second.status,200);
  await action(alice,'changeClaim',claimId,'Under Review');
  await action(alice,'changeClaim',second.data.result,'Under Review');
  const approvals = await Promise.all([action(alice,'changeClaim',claimId,'Approved'),action(alice,'changeClaim',second.data.result,'Approved')]);
  assert.equal(approvals.filter(r => r.status===200).length,1);
  const view = (await call('/api/state',undefined,alice.cookie)).data;
  const winner = view.claims.find(c => c.status==='Approved');
  const claimant = winner.claimantId === bob.user.id ? bob : outsider;
  assert.equal((await action(alice,'arrangePickup',winner.id,'Main office','2099-01-01T12:00:00.000Z')).status,200);
  const ready = await action(claimant,'confirmPickup',winner.id);
  assert.equal(ready.data.state.claims.find(c => c.id===winner.id).status,'Ready for Pickup');
  assert.equal((await action(claimant,'changeClaim',winner.id,'Completed')).status,400);
  const completed = await action(alice,'changeClaim',winner.id,'Completed');
  assert.equal(completed.data.state.items.find(i => i.id===itemId).status,'Returned');
  assert.equal(completed.data.state.claims.filter(c => c.status==='Completed').length,1);
  assert.equal(completed.data.state.claims.filter(c => c.status==='Declined').length,1);
});

test('login rotates sessions, logout revokes them, and expiry is enforced',async () => {
  assert.equal((await call('/api/auth/login',{email:'alice@example.test',password:'wrong password'})).status,401);
  assert.equal((await call('/api/auth/login',{email:'nobody@example.test',password:'wrong password'})).status,401);
  const login = await call('/api/auth/login',{email:'  ALICE@example.test  ',password},alice.cookie);
  assert.equal(login.status,200);
  assert.equal((await call('/api/state',undefined,alice.cookie)).data.user,null);
  alice.cookie = login.cookie.split(';')[0];
  assert.equal((await call('/api/state',undefined,alice.cookie)).data.user.id,alice.user.id);
  const otherDevice = await call('/api/auth/login',{email:'alice@example.test',password});
  const cookie = otherDevice.cookie.split(';')[0];
  assert.equal((await call('/api/state',undefined,cookie)).data.items[0].id,itemId);
  await call('/api/auth/logout',{},cookie);
  assert.equal((await call('/api/state',undefined,cookie)).data.user,null);
  await db.prepare('UPDATE sessions SET expires_at=0 WHERE user_id=?').bind(bob.user.id).run();
  assert.equal((await action(bob,'sendMessage',conversationId,'Expired')).status,401);
});

test('recovery rotates the one-use code, invalidates all sessions, and rejects the old password',async () => {
  const newPassword = 'reset888';
  assert.equal((await call('/api/auth/recover',{email:'alice@example.test',recoveryCode:alice.data.recoveryCode,password:'short77'})).status,400);
  const simultaneous = await Promise.all([0,1].map(() => call('/api/auth/recover',{email:'alice@example.test',recoveryCode:alice.data.recoveryCode,password:newPassword})));
  assert.deepEqual(simultaneous.map(r => r.status).sort(),[200,401]);
  const reset = simultaneous.find(r => r.status===200);
  assert.equal(reset.status,200,JSON.stringify(reset.data));
  assert.notEqual(reset.data.recoveryCode,alice.data.recoveryCode);
  assert.equal((await call('/api/state',undefined,alice.cookie)).data.user,null);
  assert.equal((await call('/api/auth/recover',{email:'alice@example.test',recoveryCode:alice.data.recoveryCode,password:newPassword})).status,401);
  assert.equal((await call('/api/auth/login',{email:'alice@example.test',password})).status,401);
  assert.equal((await call('/api/auth/login',{email:'alice@example.test',password:newPassword})).status,200);
});

test('cross-origin writes, oversized bodies, unsupported methods, and excessive auth attempts fail safely',async () => {
  assert.equal((await call('/api/auth/login',{email:'alice@example.test',password},undefined,{ Origin:'https://evil.test' })).status,403);
  assert.equal((await call('/api/auth/login',{email:'alice@example.test',password},undefined,{ Origin:'' })).status,403);
  assert.equal((await call('/api/auth/signup',{name:'Huge',email:'huge@example.test',password:'a'.repeat(5000)})).status,413);
  const method = await call('/api/auth/login'); assert.equal(method.status,405);
  for (let i=0;i<10;i++) await call('/api/auth/login',{email:'limit@example.test',password:''});
  const limited = await call('/api/auth/login',{email:'limit@example.test',password:''});
  assert.equal(limited.status,429); assert.equal(limited.headers.get('retry-after'),'60');
  assert.equal(limited.headers.get('cache-control'),'no-store');
});
