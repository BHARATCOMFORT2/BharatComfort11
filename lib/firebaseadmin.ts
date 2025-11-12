import "server-only";
import * as admin from "firebase-admin";

/**
 * ✅ Firebase Admin Lazy Singleton (Vercel + Next.js Safe)
 * Initializes only when first called — not at module import.
 */

declare global {
  // eslint-disable-next-line no-var
  var _firebaseAdminApp: admin.app.App | undefined;
}

/* ============================================================
   🔐 SAFE INITIALIZER
============================================================ */
function getAdminApp(): admin.app.App {
  if (global._firebaseAdminApp) return global._firebaseAdminApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error("❌ Missing Firebase Admin credentials in environment variables.");
  }

  const privateKey = privateKeyRaw.includes("\\n")
    ? privateKeyRaw.replace(/\\n/g, "\n")
    : privateKeyRaw;

  if (!admin.apps.length) {
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: `${projectId}.appspot.com`,
    });
    global._firebaseAdminApp = app;
    console.log("✅ Firebase Admin initialized (lazy)");
    return app;
  }

  global._firebaseAdminApp = admin.app();
  return global._firebaseAdminApp;
}

/* ============================================================
   🧩 EXPORT HELPERS
============================================================ */
export function getFirebaseAdmin() {
  const app = getAdminApp();
  const firestore = admin.firestore(app);
  const auth = admin.auth(app);
  const storage = admin.storage(app);

  return { admin, app, db: firestore, auth, storage };
}

/* ============================================================
   💡 Optional Shortcut Exports
============================================================ */
export const db = getFirebaseAdmin().db;
export const authAdmin = getFirebaseAdmin().auth;
export const storage = getFirebaseAdmin().storage;
export const adminDb = db; // alias
