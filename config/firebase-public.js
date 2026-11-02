/* Firebase web SDK configuration is public, not a service account credential.
   Server-side secrets belong in Vercel environment variables only. */
(function (root) {
  'use strict';
  root.SOKAL_FIREBASE_CONFIG = Object.freeze({
    apiKey: "AIzaSyBKqJH8EWddXthZZao7lpFZhU2d5Z65Mbw",
    authDomain: "sokal-bela-store.firebaseapp.com",
    projectId: "sokal-bela-store",
    storageBucket: "sokal-bela-store.firebasestorage.app",
    messagingSenderId: "461746078421",
    appId: "1:461746078421:web:76d7e15bd0c179a6ba985c",
    measurementId: "G-QH41QC1D8X"
  });
})(typeof window !== "undefined" ? window : globalThis);
