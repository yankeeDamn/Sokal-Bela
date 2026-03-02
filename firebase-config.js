// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBKqJH8EWddXthZZao7lpFZhU2d5Z65Mbw",
  authDomain: "sokal-bela-store.firebaseapp.com",
  projectId: "sokal-bela-store",
  storageBucket: "sokal-bela-store.firebasestorage.app",
  messagingSenderId: "461746078421",
  appId: "1:461746078421:web:76d7e15bd0c179a6ba985c",
  measurementId: "G-QH41QC1D8X"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Export the db for use in other files
export { db };