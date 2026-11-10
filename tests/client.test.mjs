import { test } from 'node:test';
import assert from 'node:assert/strict';
globalThis.window = new EventTarget();
globalThis.document = { addEventListener() {} };
globalThis.BroadcastChannel = undefined;
const { service } = await import('../src/service.js');
const { safeNext, auth } = await import('../src/pages/auth.js');
const { profile } = await import('../src/pages/profile.js');
const state = { user:{id:'alice',name:'<script>Alice</script>',email:'alice@example.test',initials:'<A>'},users:[],items:[],claims:[],conversations:[],messages:[] };

test('only internal, supported return destinations survive login',() => {
  for (const unsafe of ['https://evil.test','//evil.test','/login','/signup','javascript:alert(1)','/profile#x']) assert.equal(safeNext(unsafe),'/profile');
  assert.equal(safeNext('/report?type=lost'),'/report?type=lost');
  assert.equal(safeNext('/messages/abc-123'),'/messages/abc-123');
  const html = auth('login',new URLSearchParams('next=https://evil.test'));
  assert.ok(html.includes('autocomplete="current-password"')); assert.ok(!html.includes('evil.test'));
  for (const page of ['signup','recover']) {
    const form = auth(page,new URLSearchParams());
    assert.match(form,/minlength="8" maxlength="128"/);
    assert.match(form,/at least 8 characters/);
  }
});

test('server mutations are awaited in order and returned user text is escaped',async () => {
  let active = 0, maximum = 0;
  globalThis.fetch = async (path,options) => {
    if (path === '/api/state') return Response.json(state);
    active++; maximum=Math.max(maximum,active);
    await new Promise(resolve => setTimeout(resolve,5)); active--;
    const body = JSON.parse(options.body);
    assert.equal(options.credentials,'same-origin');
    return Response.json({result:body.args[0],state});
  };
  await service.refresh();
  assert.match(profile(),/&lt;script&gt;Alice&lt;\/script&gt;/);
  assert.match(profile(),/&lt;A&gt;/);
  assert.deepEqual(await Promise.all([service.contact('first'),service.contact('second')]),['first','second']);
  assert.equal(maximum,1);
});

test('an expired session immediately clears private data and announces login is needed',async () => {
  let expired=false;
  window.addEventListener('reclaim:session-expired',()=> { expired=true; },{once:true});
  globalThis.fetch = async () => Response.json({error:'Please log in to continue.'},{status:401});
  await assert.rejects(service.contact('item'),/Please log in/);
  assert.equal(service.currentUser(),null); assert.deepEqual(service.claims(),[]); assert.equal(expired,true);
});

test('one-use recovery code remains available if loading the new account briefly fails',async () => {
  globalThis.fetch = async path => path.includes('/auth/') ? Response.json({ok:true,recoveryCode:'test-only-code'}) : Promise.reject(new Error('offline'));
  const result = await service.authenticate('signup',{name:'Test',email:'test@example.test',password:'testpass'});
  assert.equal(result.recoveryCode,'test-only-code');
  assert.equal(service.currentUser(),null);
});

test('an old response cannot restore private data after another tab changes accounts',async () => {
  let broadcast, release;
  globalThis.BroadcastChannel = class { constructor() { broadcast=this; } };
  const { service:tab } = await import('../src/service.js?isolated-tab-test');
  globalThis.fetch = async path => {
    if (path==='/api/state') return Response.json(state);
    return new Promise(resolve => { release=()=>resolve(Response.json({result:'id',state})); });
  };
  await tab.refresh();
  const pending=tab.contact('item');
  await new Promise(resolve => setTimeout(resolve,0));
  broadcast.onmessage();
  assert.equal(tab.currentUser(),null);
  release();
  await assert.rejects(pending,/account changed/);
  assert.equal(tab.currentUser(),null);
});
