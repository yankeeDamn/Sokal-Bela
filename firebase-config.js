// Shared Firebase config for optional modular usage in non-inline scripts.
const firebaseConfig = {
  apiKey: "AIzaSyBKqJH8EWddXthZZao7lpFZhU2d5Z65Mbw",
  authDomain: "sokal-bela-store.firebaseapp.com",
  projectId: "sokal-bela-store",
  storageBucket: "sokal-bela-store.firebasestorage.app",
  messagingSenderId: "461746078421",
  appId: "1:461746078421:web:76d7e15bd0c179a6ba985c",
  measurementId: "G-QH41QC1D8X"
};

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
