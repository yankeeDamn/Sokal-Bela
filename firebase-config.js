// Shared Firebase config for optional modular usage in non-inline scripts.
import "./config/firebase-public.js";
const firebaseConfig = window.SOKAL_FIREBASE_CONFIG;

let app = null;
let db = null;
let auth = null;

if (typeof firebase !== "undefined") {
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  app = firebase.app();
  if (firebase.firestore) db = firebase.firestore();
  if (firebase.auth) auth = firebase.auth();
}

export { firebaseConfig, app, db, auth };
