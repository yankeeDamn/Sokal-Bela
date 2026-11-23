'use strict';
// Customer/admin accounts on PostgreSQL: scrypt passwords, opaque session
// cookies (only a SHA-256 hash is stored), and an append-only sign-in log.
const crypto = require('node:crypto');
const c = require('./neon-core');

const COOKIE = 'sb_sid';
const CUSTOMER_SESSION_MS = 30 * 24 * 3600 * 1000;
const ADMIN_SESSION_MS = 8 * 3600 * 1000;
const MAX_FAILS = 6;           // failed logins per phone ...
const FAIL_WINDOW_MIN = 15;    // ... within this many minutes => temporary lock

function scryptAsync(password, salt, keylen, opts) {
  return new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, keylen, opts, (err, key) => err ? reject(err) : resolve(key)));
}
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const N = 16384, r = 8, p = 1;
  const key = await scryptAsync(password, salt, 32, { N, r, p, maxmem: 64 * 1024 * 1024 });
  return ['scrypt', N, r, p, salt.toString('base64'), key.toString('base64')].join('$');
}
async function verifyPassword(password, stored) {
  try {
    const [scheme, N, r, p, salt, hash] = String(stored).split('$');
    if (scheme !== 'scrypt') return false;
    const expected = Buffer.from(hash, 'base64');
    const key = await scryptAsync(password, Buffer.from(salt, 'base64'), expected.length,
      { N: +N, r: +r, p: +p, maxmem: 64 * 1024 * 1024 });
    return key.length === expected.length && crypto.timingSafeEqual(key, expected);
  } catch { return false; }
}
// Burn comparable CPU when the phone is unknown, so timing does not reveal accounts.
const DUMMY_HASH_PROMISE = hashPassword('dummy-password-for-timing');

function sha256(value) { return crypto.createHash('sha256').update(String(value)).digest('hex'); }
function clientIp(req) {
  return String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] ||
    req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}
function ipHash(req) {
  return sha256((process.env.IP_HASH_SALT || process.env.OTP_HASH_SECRET || 'sokal-bela-ip') + ':' + clientIp(req));
}
function agent(req) { return String(req.headers['user-agent'] || '').slice(0, 200); }

function readCookie(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return '';
}
function secureCookies(req) {
  return process.env.NODE_ENV !== 'test' && !(req.headers.host || '').startsWith('localhost');
}
function setCookie(req, res, token, maxAgeSec) {
  res.setHeader('Set-Cookie', COOKIE + '=' + token + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + maxAgeSec +
    (secureCookies(req) ? '; Secure' : ''));
}
function clearCookie(req, res) { setCookie(req, res, '', 0); }

async function log(db, { userId = null, phone = '', event, detail = '', req }) {
  await db.query(
    'INSERT INTO auth_logs(user_id,phone,event,detail,ip_hash,user_agent) VALUES($1,$2,$3,$4,$5,$6)',
    [userId, String(phone).slice(0, 10), event, String(detail).slice(0, 200), req ? ipHash(req) : '', req ? agent(req) : '']);
}

async function createSession(db, req, res, user) {
  const token = crypto.randomBytes(32).toString('base64url');
  const ms = user.role === 'admin' ? ADMIN_SESSION_MS : CUSTOMER_SESSION_MS;
  await db.query('DELETE FROM user_sessions WHERE user_id=$1 AND expires_at < NOW()', [user.id]);
  await db.query(
    "INSERT INTO user_sessions(user_id,token_hash,user_agent,expires_at) VALUES($1,$2,$3,NOW() + ($4 * INTERVAL '1 millisecond'))",
    [user.id, sha256(token), agent(req), ms]);
  setCookie(req, res, token, Math.floor(ms / 1000));
}

const PUBLIC_USER = 'u.id::text AS id,u.phone,u.name,u.email,u.role,u.default_address,u.default_pincode';
// Returns the signed-in, non-blocked user or null.
async function currentUser(req, db = c.db()) {
  const token = readCookie(req, COOKIE);
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return null;
  const r = await db.query(
    'SELECT ' + PUBLIC_USER + ',s.id AS session_id FROM user_sessions s JOIN users u ON u.id=s.user_id ' +
    "WHERE s.token_hash=$1 AND s.expires_at > NOW() AND u.status='active'", [sha256(token)]);
  return r.rows[0] || null;
}
async function requireUser(req, res) {
  const user = await currentUser(req);
  if (!user) { c.respond(res, 401, { ok: false, code: 'AUTH_REQUIRED', error: 'Please sign in to continue.' }); return null; }
  return user;
}
async function requireAdmin(req, res) {
  const user = await currentUser(req);
  if (!user) { c.respond(res, 401, { ok: false, code: 'AUTH_REQUIRED', error: 'Please sign in.' }); return null; }
  if (user.role !== 'admin') { c.respond(res, 403, { ok: false, code: 'FORBIDDEN', error: 'Administrator access required.' }); return null; }
  return user;
}
function validPassword(value) {
  const pw = typeof value === 'string' ? value : '';
  if (pw.length < 8 || pw.length > 128) throw c.bad('Password must be 8 to 128 characters.');
  return pw;
}
function validEmail(value) {
  const e = c.clean(value, 254).toLowerCase();
  if (!e) return null;
  if (!/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw c.bad('Enter a valid email address or leave it blank.');
  return e;
}
module.exports = {
  COOKIE, MAX_FAILS, FAIL_WINDOW_MIN, hashPassword, verifyPassword, DUMMY_HASH_PROMISE, sha256, ipHash,
  readCookie, setCookie, clearCookie, log, createSession, currentUser, requireUser, requireAdmin,
  validPassword, validEmail
};
