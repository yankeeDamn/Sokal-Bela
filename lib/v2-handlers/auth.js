'use strict';
// POST /api/v2/auth?action=signup|login|logout|profile|password   GET ?action=me
const c = require('../neon-core');
const a = require('../auth-core');

async function signup(req, res) {
  c.validateHoneypot(req.body);
  const b = req.body;
  const name = c.required(b.name, 120, 'Name'), phone = c.phone(b.phone), password = a.validPassword(b.password);
  const email = a.validEmail(b.email);
  await c.enforceLimit(req, 'signup', 5, 30);
  const db = c.db();
  const hash = await a.hashPassword(password);
  let user;
  try {
    const r = await db.query(
      "INSERT INTO users(phone,name,email,password_hash) VALUES($1,$2,$3,$4) RETURNING id::text AS id,phone,name,email,role,default_address,default_pincode",
      [phone, name, email, hash]);
    user = r.rows[0];
  } catch (e) {
    if (e.code === '23505') throw c.bad('An account with this phone or email already exists. Please sign in.', 'ACCOUNT_EXISTS', 409);
    throw e;
  }
  await a.log(db, { userId: user.id, phone, event: 'signup', req });
  await a.createSession(db, req, res, user);
  return c.respond(res, 201, { ok: true, user });
}

async function login(req, res) {
  c.validateHoneypot(req.body);
  const phone = c.phone(req.body.phone), password = typeof req.body.password === 'string' ? req.body.password : '';
  await c.enforceLimit(req, 'login', 20, 15);
  const db = c.db();
  const fails = await db.query(
    "SELECT COUNT(*)::int AS n FROM auth_logs WHERE phone=$1 AND event='login_failed' AND created_at > NOW() - ($2 * INTERVAL '1 minute') " +
    "AND created_at > COALESCE((SELECT MAX(created_at) FROM auth_logs WHERE phone=$1 AND event='login_success'), 'epoch')",
    [phone, a.FAIL_WINDOW_MIN]);
  if (fails.rows[0].n >= a.MAX_FAILS) {
    await a.log(db, { phone, event: 'login_blocked', detail: 'too many failed attempts', req });
    throw c.bad('Too many failed sign-in attempts. Try again in ' + a.FAIL_WINDOW_MIN + ' minutes.', 'LOGIN_LOCKED', 429);
  }
  const r = await db.query(
    "SELECT id::text AS id,phone,name,email,role,status,default_address,default_pincode,password_hash FROM users WHERE phone=$1", [phone]);
  const row = r.rows[0];
  const ok = await a.verifyPassword(password, row ? row.password_hash : await a.DUMMY_HASH_PROMISE);
  if (!row || !ok) {
    await a.log(db, { userId: row?.id || null, phone, event: 'login_failed', detail: row ? 'wrong password' : 'unknown phone', req });
    throw c.bad('Incorrect phone number or password.', 'BAD_CREDENTIALS', 401);
  }
  if (row.status !== 'active') {
    await a.log(db, { userId: row.id, phone, event: 'login_failed', detail: 'account blocked', req });
    throw c.bad('This account is blocked. Please contact the shop.', 'ACCOUNT_BLOCKED', 403);
  }
  await db.query('UPDATE users SET last_login_at=NOW() WHERE id=$1', [row.id]);
  await a.log(db, { userId: row.id, phone, event: 'login_success', req });
  delete row.password_hash; delete row.status;
  await a.createSession(db, req, res, row);
  return c.respond(res, 200, { ok: true, user: row });
}

async function logout(req, res) {
  const db = c.db(), token = a.readCookie(req, a.COOKIE);
  if (token) {
    const r = await db.query('DELETE FROM user_sessions s USING users u WHERE s.token_hash=$1 AND u.id=s.user_id RETURNING u.id::text AS id,u.phone', [a.sha256(token)]);
    if (r.rowCount) await a.log(db, { userId: r.rows[0].id, phone: r.rows[0].phone, event: 'logout', req });
  }
  a.clearCookie(req, res);
  return c.respond(res, 200, { ok: true });
}

async function profile(req, res, user) {
  const name = c.required(req.body.name, 120, 'Name'), email = a.validEmail(req.body.email);
  const address = c.clean(req.body.defaultAddress, 500);
  const pincode = c.clean(req.body.defaultPincode, 6);
  if (pincode && !/^[0-9]{6}$/.test(pincode)) throw c.bad('Enter a valid six-digit pincode.');
  try {
    const r = await c.db().query(
      "UPDATE users SET name=$2,email=$3,default_address=$4,default_pincode=$5 WHERE id=$1 RETURNING id::text AS id,phone,name,email,role,default_address,default_pincode",
      [user.id, name, email, address, pincode]);
    return c.respond(res, 200, { ok: true, user: r.rows[0] });
  } catch (e) {
    if (e.code === '23505') throw c.bad('That email is already used by another account.', 'EMAIL_EXISTS', 409);
    throw e;
  }
}

async function password(req, res, user) {
  const current = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
  const next = a.validPassword(req.body.newPassword);
  const db = c.db();
  const r = await db.query('SELECT password_hash FROM users WHERE id=$1', [user.id]);
  if (!(await a.verifyPassword(current, r.rows[0].password_hash))) throw c.bad('Current password is incorrect.', 'BAD_CREDENTIALS', 403);
  await db.query('UPDATE users SET password_hash=$2 WHERE id=$1', [user.id, await a.hashPassword(next)]);
  // Sign out every other device after a password change.
  await db.query('DELETE FROM user_sessions WHERE user_id=$1 AND id<>$2', [user.id, user.session_id]);
  await a.log(c.db(), { userId: user.id, phone: user.phone, event: 'password_changed', req });
  return c.respond(res, 200, { ok: true });
}

module.exports = async (req, res) => {
  try {
    const action = String(req.query?.action || '');
    if (action === 'me') {
      if (!c.allow(req, res, 'GET')) return;
      const user = await a.currentUser(req);
      return c.respond(res, 200, { ok: true, user: user ? { ...user, session_id: undefined } : null });
    }
    if (!c.allow(req, res, 'POST')) return;
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw c.bad('Invalid JSON body.');
    if (action === 'signup') return await signup(req, res);
    if (action === 'login') return await login(req, res);
    if (action === 'logout') return await logout(req, res);
    if (action === 'profile' || action === 'password') {
      const user = await a.requireUser(req, res); if (!user) return;
      return action === 'profile' ? await profile(req, res, user) : await password(req, res, user);
    }
    throw c.bad('Unknown action.', 'NOT_FOUND', 404);
  } catch (e) { return c.fail(res, e); }
};
