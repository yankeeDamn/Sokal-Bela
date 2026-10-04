import admin from 'firebase-admin';

let initialized = false;

export function initializeFirebase() {
  if (initialized) return;
  
  try {
    // Firebase Admin SDK initialization from environment
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      });
    }
    initialized = true;
  } catch (err) {
    console.error('Failed to initialize Firebase:', err);
    throw err;
  }
}

export function getDb() {
  initializeFirebase();
  return admin.firestore();
}

export function getAuth() {
  initializeFirebase();
  return admin.auth();
}

export function handleError(res, err, statusCode = 500) {
  console.error(err);
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
  });
}

export function handleSuccess(res, data, statusCode = 200) {
  res.status(statusCode).json(data);
}
