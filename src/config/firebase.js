const admin = require("firebase-admin");

let db, bucket;

function initFirebase() {
  if (admin.apps.length > 0) return; // ya inicializado

  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });

  db = admin.firestore();
  bucket = admin.storage().bucket();

  console.log("✅ Firebase inicializado correctamente");
}

function getDb() {
  if (!db) throw new Error("Firebase no inicializado. Llama initFirebase() primero.");
  return db;
}

function getBucket() {
  if (!bucket) throw new Error("Firebase Storage no inicializado.");
  return bucket;
}

module.exports = { initFirebase, getDb, getBucket };
