'use strict';
// Run locally with FIREBASE_SERVICE_ACCOUNT_JSON and ADMIN_EMAILS set, never in a browser.
const admin = require('firebase-admin');
async function main() {
  const email = (process.argv[2] || '').trim().toLowerCase();
  const allowed = (process.env.ADMIN_EMAILS || '').split(',').map(x => x.trim().toLowerCase());
  if (!email || !allowed.includes(email)) throw new Error('Email must be explicitly listed in ADMIN_EMAILS.');
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is required.');
  admin.initializeApp({credential:admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))});
  const user = await admin.auth().getUserByEmail(email);
  if (user.disabled || !user.emailVerified) throw new Error('Account must be enabled and its email verified.');
  await admin.auth().setCustomUserClaims(user.uid, {...(user.customClaims || {}), role:'admin'});
  console.log('Admin claim assigned to existing user. Sign out and in to refresh the token.');
}
main().catch(err => { console.error(err.message); process.exitCode=1; });
