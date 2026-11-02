'use strict';
const crypto = require('node:crypto');

const OTP_TTL_MS = 5 * 60 * 1000;
const ADMIN_SESSION_MS = 2 * 60 * 60 * 1000;
const USER_SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const COOKIE_USER = 'sb_session';
const COOKIE_ADMIN = 'sb_admin_session';

function firebase() {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing');
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin;
}
function firestore() { return firebase().firestore(); }
function allowedAdmin(email) {
  return (process.env.ADMIN_EMAILS || '').split(',').map(v => v.trim().toLowerCase())
    .filter(Boolean).includes(String(email || '').toLowerCase());
}
function validEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}
function mac(input) {
  const secret = process.env.OTP_HASH_SECRET;
  if (!secret || secret.length < 32) throw new Error('OTP_HASH_SECRET must contain at least 32 characters');
  return crypto.createHmac('sha256', secret).update(String(input)).digest('hex');
}
function equal(a, b) {
  const x = Buffer.from(String(a), 'hex'), y = Buffer.from(String(b), 'hex');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function ipAddress(req) {
  return String(req.headers['x-vercel-forwarded-for'] || req.headers['x-real-ip'] ||
    req.socket?.remoteAddress || '').split(',')[0].trim().slice(0, 90);
}
function setHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
}
function checkOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const site = new URL(origin);
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0];
    return site.host === host && site.protocol === 'https:' ||
      (process.env.NODE_ENV !== 'production' && site.host === host);
  } catch { return false; }
}
function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map(s => {
    const n = s.indexOf('=');
    return n < 0 ? [] : [s.slice(0, n).trim(), decodeURIComponent(s.slice(n + 1).trim())];
  }).filter(pair => pair.length === 2));
}
function cookieHeader(name, value, maxAgeSeconds) {
  return name + '=' + encodeURIComponent(value) + '; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=' + maxAgeSeconds;
}
async function requireAdmin(req) {
  const session = cookies(req)[COOKIE_ADMIN];
  if (!session) return null;
  try {
    const decoded = await firebase().auth().verifySessionCookie(session, true);
    if (!allowedAdmin(decoded.email) || decoded.role !== 'admin') return null;
    return decoded;
  } catch { return null; }
}
// Enforce sliding inactivity server-side; only a valid admin session can refresh this document.
async function requireActiveAdmin(req) {
  const decoded = await requireAdmin(req);
  if (!decoded) return null;
  const session = cookies(req)[COOKIE_ADMIN];
  const id = mac('session:' + session);
  const ref = firestore().collection('adminSessions').doc(id);
  const now = Date.now();
  const result = await firestore().runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists || now - Number(snap.data().lastSeen || 0) > 15 * 60 * 1000) return false;
    tx.update(ref, { lastSeen: now });
    return true;
  });
  return result ? decoded : null;
}
async function sendOtpMail(to, code) {
  const key = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
  if (!key || !from) throw new Error('Email provider not configured');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from, to: [to], subject: 'Your Sokal Bela sign-in code',
      text: 'Your Sokal Bela verification code is ' + code + '. It expires in 5 minutes. Never share this code.',
      html: '<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#153b20">' +
        '<h1 style="color:#2d7a3a">🥬 Sokal Bela (সকাল বেলা)</h1><p>Your one-time sign-in code:</p>' +
        '<p style="font-size:36px;font-weight:700;letter-spacing:8px">' + code + '</p>' +
        '<p>This code expires in 5 minutes and works only once. If you did not request it, ignore this message.</p></div>'
    })
  });
  if (!response.ok) throw new Error('Email provider delivery failed: ' + response.status);
}
async function hitLimit(ref, now, windowMs, max) {
  return firestore().runTransaction(async tx => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : {};
    const start = Number(data.start || 0);
    const count = now - start >= windowMs ? 0 : Number(data.count || 0);
    if (count >= max) return false;
    tx.set(ref, { start: count ? start : now, count: count + 1, updatedAt: now });
    return true;
  });
}
async function requestOtp(req, res) {
  const email = validEmail(req.body?.email);
  if (!email) return res.status(400).json({ error: 'Enter a valid email address.' });
  const purpose = req.body?.purpose === 'admin' ? 'admin' : 'customer';
  const now = Date.now(), db = firestore();
  const ipRef = db.collection('authRateLimits').doc('ip-' + mac(ipAddress(req)));
  const emailRef = db.collection('authRateLimits').doc('email-' + mac(email));
  const [ipOk, emailOk] = await Promise.all([
    hitLimit(ipRef, now, 15 * 60 * 1000, 20),
    hitLimit(emailRef, now, 15 * 60 * 1000, 5)
  ]);
  if (!ipOk || !emailOk) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  const ref = db.collection('authOtp').doc(mac(purpose + ':' + email));
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const allowed = purpose !== 'admin' || allowedAdmin(email);
  let cooldown = false;
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (snap.exists && now - Number(snap.data().sentAt || 0) < 30000) {
      cooldown = true; return;
    }
    tx.set(ref, { digest: mac(purpose + ':' + email + ':' + code), email,
      purpose, expiresAt: now + OTP_TTL_MS, sentAt: now, attempts: 0, used: false });
  });
  if (cooldown) return res.status(429).json({ error: 'Please wait 30 seconds before requesting another code.' });
  // Do not reveal whether an administrator email is in the allowlist.
  if (allowed) {
    try { await sendOtpMail(email, code); }
    catch (err) {
      console.error('OTP delivery failed:', err.message);
      await ref.delete().catch(() => {});
      return res.status(503).json({ error: 'Unable to send email right now. Please try again.' });
    }
  }
  return res.status(200).json({ ok: true, message: 'If eligible, a verification code has been sent.', expiresIn: 300, resendIn: 30 });
}
async function verifyOtp(req, res) {
  const email = validEmail(req.body?.email), code = String(req.body?.code || '');
  const purpose = req.body?.purpose === 'admin' ? 'admin' : 'customer';
  if (!email || !/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Enter a valid email and six-digit code.' });
  if (purpose === 'admin' && !allowedAdmin(email)) return res.status(400).json({ error: 'Invalid or expired code.' });
  const ref = firestore().collection('authOtp').doc(mac(purpose + ':' + email));
  let result = 'invalid';
  await firestore().runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const doc = snap.data();
    if (doc.used) return;
    if (Date.now() >= Number(doc.expiresAt)) { result = 'expired'; tx.delete(ref); return; }
    if (Number(doc.attempts || 0) >= 5) { result = 'locked'; return; }
    if (!equal(doc.digest, mac(purpose + ':' + email + ':' + code))) {
      const attempts = Number(doc.attempts || 0) + 1;
      result = attempts >= 5 ? 'locked' : 'invalid';
      tx.update(ref, { attempts }); return;
    }
    tx.delete(ref); result = 'ok'; // atomic single-use enforcement
  });
  if (result !== 'ok') {
    const error = result === 'expired' ? 'Code expired. Request another.' :
      result === 'locked' ? 'Too many incorrect attempts. Request a new code later.' : 'Invalid or expired code.';
    return res.status(result === 'locked' ? 429 : 400).json({ error });
  }
  const admin = firebase();
  let user;
  try { user = await admin.auth().getUserByEmail(email); }
  catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
    try { user = await admin.auth().createUser({ email, emailVerified: true }); }
    catch (createErr) {
      if (createErr.code !== 'auth/email-already-exists') throw createErr;
      user = await admin.auth().getUserByEmail(email);
    }
  }
  const role = purpose === 'admin' ? 'admin' : 'Customer';
  if (purpose === 'admin') await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });
  await firestore().collection('users').doc(user.uid).set({
    uid: user.uid, email, role: role === 'admin' ? 'Admin' : 'Customer',
    displayName: user.displayName || email.split('@')[0],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLoginAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  return res.status(200).json({ ok: true, customToken: await admin.auth().createCustomToken(user.uid, { role }), role: purpose });
}
async function createSession(req, res) {
  const idToken = req.body?.idToken, adminLogin = req.body?.purpose === 'admin';
  if (typeof idToken !== 'string' || idToken.length > 8192) return res.status(400).json({ error: 'Invalid session.' });
  const auth = firebase().auth();
  const decoded = await auth.verifyIdToken(idToken, true).catch(() => null);
  if (!decoded || Date.now() / 1000 - decoded.auth_time > 5 * 60)
    return res.status(401).json({ error: 'Please sign in again.' });
  if (adminLogin && (!allowedAdmin(decoded.email) || decoded.role !== 'admin'))
    return res.status(403).json({ error: 'Forbidden' });
  const ms = adminLogin ? ADMIN_SESSION_MS : USER_SESSION_MS;
  const session = await auth.createSessionCookie(idToken, { expiresIn: ms });
  const name = adminLogin ? COOKIE_ADMIN : COOKIE_USER;
  res.setHeader('Set-Cookie', cookieHeader(name, session, Math.floor(ms / 1000)));
  if (adminLogin) await firestore().collection('adminSessions').doc(mac('session:' + session))
    .set({ uid: decoded.uid, lastSeen: Date.now(), createdAt: Date.now() });
  return res.status(200).json({ ok: true });
}
function clearSessions(res) {
  res.setHeader('Set-Cookie', [
    cookieHeader(COOKIE_USER, '', 0), cookieHeader(COOKIE_ADMIN, '', 0)
  ]);
}
module.exports = {
  firebase, firestore, allowedAdmin, validEmail, setHeaders, checkOrigin, cookies,
  requireAdmin, requireActiveAdmin, requestOtp, verifyOtp, createSession, clearSessions
};
