// lib/firebaseadmin.ts
import admin from "firebase-admin";

let adminDb: FirebaseFirestore.Firestore;
let auth: admin.auth.Auth;

/**
 * Lazy-initialize Firebase Admin SDK at runtime.
 * Call this inside your API routes to avoid build-time errors on Netlify.
 */
export function getFirebaseAdmin() {
  if (!admin.apps.length) {
    if (
      !process.env.FIREBASE_PROJECT_ID ||
      !process.env.FIREBASE_CLIENT_EMAIL ||
      !process.env.FIREBASE_PRIVATE_KEY
    ) {
      throw new Error("Firebase Admin credentials are missing!");
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });

    adminDb = admin.firestore();
    auth = admin.auth();
  }

  return { admin, adminDb, auth };
}
