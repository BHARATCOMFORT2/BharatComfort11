import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
let app: admin.app.App;

// ✅ Prevent reinitialization in Next.js (hot reload issue)
if (!admin.apps.length) {
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
} else {
  app = admin.app();
}

// Firebase Admin services
export const adminAuth = admin.auth(app);
export const adminDb = admin.firestore(app);
export const adminStorage = admin.storage(app);
export const firebaseAdmin = admin;
export default app;
