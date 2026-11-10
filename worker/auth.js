import { randomBytes, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { publicUser } from './storage.js';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (condition, status, message) => { if (!condition) throw new HttpError(status, message); };
export const digest = value => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('hex');
const derive = (password, salt) => new Promise((resolve, reject) => scrypt(password, salt, 32,
  { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));
async function hashPassword(password) {
  const salt = token();
  return `scrypt:${salt}:${(await derive(password, salt)).toString('hex')}`;
}
async function checkPassword(password, stored) {
  // Spend the same hashing work on unknown email addresses.
  const [,salt,expected] = (stored || `scrypt:${'0'.repeat(64)}:${'0'.repeat(64)}`).split(':');
  return timingSafeEqual(await derive(password,salt), Buffer.from(expected,'hex'));
}
function emailInput(value) {
  fail(typeof value === 'string',400,'Enter your email address.');
  const email = value.trim().toLowerCase();
  fail(email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),400,'Enter a valid email address.');
  return email;
}
function passwordInput(value, creating = false) {
  fail(typeof value === 'string' && value.length <= 128 && value.length >= (creating ? 8 : 1),400,
    creating ? 'Use a password between 8 and 128 characters.' : 'Enter your password.');
  return value;
}
const cookieName = request => new URL(request.url).protocol === 'https:' ? '__Host-reclaim_session' : 'reclaim_session';
const sessionCookie = (request, value, maxAge) => `${cookieName(request)}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
const sessionToken = request => (request.headers.get('cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName(request)}=`))?.split('=')[1];

export async function currentUser(request, db) {
  const raw = sessionToken(request);
  if (!raw || !/^[a-f0-9]{64}$/.test(raw)) return null;
  const row = await db.prepare('SELECT u.id,u.name,u.email FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?')
    .bind(digest(raw),Date.now()).first();
  return row ? { ...publicUser(row), email: row.email } : null;
}

async function session(request, db, userId, statements = [], expectedPasswordHash) {
  const raw = token(), now = Date.now(), seconds = 30 * 24 * 60 * 60;
  const previous = sessionToken(request);
  if (previous) statements.push(db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(digest(previous)));
  statements.push(db.prepare('DELETE FROM sessions WHERE expires_at<=?').bind(now));
  statements.push(expectedPasswordHash ? db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) SELECT ?,id,? FROM users WHERE id=? AND password_hash=? RETURNING user_id')
    .bind(digest(raw),now + seconds * 1000,userId,expectedPasswordHash) : db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?) RETURNING user_id').bind(digest(raw),userId,now + seconds * 1000));
  const results = await db.batch(statements);
  fail(results.at(-1).results.length,401,'Your password changed. Please log in again.');
  return sessionCookie(request, raw, seconds);
}

export async function rateLimit(db, key, limit, interval = 60_000) {
  const now = Date.now(), bucket = Math.floor(now/interval), hashed = digest(`${key}:${bucket}`);
  const row = await db.prepare('INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count')
    .bind(hashed,(bucket + 1)*interval).first();
  fail(row.count <= limit,429,'Too many attempts. Please wait a minute and try again.');
}

export async function authenticate(request, db, action, body) {
  if (action === 'logout') {
    const raw = sessionToken(request);
    if (raw) await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(digest(raw)).run();
    return { cookie: sessionCookie(request,'',0) };
  }
  fail(['signup','login','recover'].includes(action),404,'This account action does not exist.');
  await rateLimit(db,`auth-ip:${request.headers.get('CF-Connecting-IP') || 'local'}`,15);
  const email = emailInput(body.email);
  await rateLimit(db,`auth-email:${email}`,10);
  const password = passwordInput(body.password,action !== 'login');
  if (action === 'signup') {
    fail(typeof body.name === 'string' && body.name.trim().length >= 2 && body.name.trim().length <= 80,400,'Enter a name between 2 and 80 characters.');
    const userId = crypto.randomUUID(), recoveryCode = token();
    const passwordHash = await hashPassword(password);
    try {
      const cookie = await session(request,db,userId,[db.prepare('INSERT INTO users (id,email,name,password_hash,recovery_hash,created_at) VALUES (?,?,?,?,?,?)')
        .bind(userId,email,body.name.trim(),passwordHash,digest(recoveryCode),Date.now())]);
      return { cookie, recoveryCode };
    } catch (error) {
      if (String(error).includes('UNIQUE constraint failed: users.email')) throw new HttpError(409,'Could not create this account. Try logging in, or use another email address.');
      throw error;
    }
  }
  const row = await db.prepare('SELECT id,password_hash,recovery_hash FROM users WHERE email=?').bind(email).first();
  if (action === 'login') {
    fail(await checkPassword(password,row?.password_hash) && row,401,'The email or password is incorrect.');
    return { cookie: await session(request,db,row.id,[],row.password_hash) };
  }
  fail(typeof body.recoveryCode === 'string' && /^[a-f0-9]{64}$/.test(body.recoveryCode.trim()),400,'Enter the recovery code you saved when you created your account.');
  const recoveryHash = digest(body.recoveryCode.trim());
  fail(row && timingSafeEqual(Buffer.from(recoveryHash,'hex'),Buffer.from(row.recovery_hash,'hex')),401,'The email or recovery code is incorrect.');
  const recoveryCode = token(), nextRecoveryHash = digest(recoveryCode), passwordHash = await hashPassword(password);
  const raw = token(), seconds = 30 * 24 * 60 * 60;
  // Reset credentials, revoke all sessions, and issue the replacement session atomically.
  // Every later statement is conditional on this request winning the one-use code.
  const updates = await db.batch([
    db.prepare('UPDATE users SET password_hash=?, recovery_hash=? WHERE id=? AND recovery_hash=? RETURNING id').bind(passwordHash,nextRecoveryHash,row.id,recoveryHash),
    db.prepare('DELETE FROM sessions WHERE user_id=? AND EXISTS(SELECT id FROM users WHERE id=? AND recovery_hash=?)').bind(row.id,row.id,nextRecoveryHash),
    db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) SELECT ?,id,? FROM users WHERE id=? AND recovery_hash=?').bind(digest(raw),Date.now()+seconds*1000,row.id,nextRecoveryHash),
  ]);
  fail(updates[0].results.length,401,'This recovery code has already been used.');
  return { cookie:sessionCookie(request,raw,seconds), recoveryCode };
}

export async function jsonBody(request, limit = 1_500_000) {
  fail(request.headers.get('content-type')?.split(';')[0] === 'application/json',415,'Send this request as JSON.');
  const reader = request.body?.getReader();
  fail(reader,400,'A request body is required.');
  const chunks = []; let length = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    length += value.byteLength;
    if (length > limit) { await reader.cancel(); throw new HttpError(413,'This request is too large. Try fewer or smaller photos.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
  let body;
  try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new HttpError(400,'This request could not be read.'); }
  fail(body && typeof body === 'object' && !Array.isArray(body),400,'Send a JSON object.');
  return body;
}
