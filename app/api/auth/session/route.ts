// lib/firebaseadmin.ts
import "server-only";
import * as admin from "firebase-admin";

declare global {
  // Prevent double initialization during HMR
  // eslint-disable-next-line no-var
  var _firebaseAdminApp: admin.app.App | undefined;
}

/* -------------------------------------------------------
   Helper: Load environment variable safely
------------------------------------------------------- */
function getEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v : undefined;
}

/* -------------------------------------------------------
   Helper: Load private key
------------------------------------------------------- */
function getPrivateKey(): string {
  const base64Key = getEnv("FIREBASE_PRIVATE_KEY_BASE64");

  if (base64Key) {
    return Buffer.from(base64Key, "base64").toString("utf8");
  }

  const rawKey = getEnv("FIREBASE_PRIVATE_KEY");
  if (!rawKey) {
    throw new Error(
      "❌ Missing Firebase private key. Provide FIREBASE_PRIVATE_KEY or FIREBASE_PRIVATE_KEY_BASE64"
    );
  }

  return rawKey.replace(/\\n/g, "\n");
}

/* -------------------------------------------------------
   Initialize Admin SDK (SAFE SINGLETON)
------------------------------------------------------- */
export function getAdminApp(): admin.app.App {
  if (global._firebaseAdminApp) return global._firebaseAdminApp;

  const projectId = getEnv("FIREBASE_PROJECT_ID");
  const clientEmail = getEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      `❌ Missing Firebase Admin environment variables:
       ${!projectId ? "FIREBASE_PROJECT_ID " : ""}
       ${!clientEmail ? "FIREBASE_CLIENT_EMAIL " : ""}
       ${!privateKey ? "FIREBASE_PRIVATE_KEY / BASE64 " : ""}`
    );
  }

  global._firebaseAdminApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket: `${projectId}.appspot.com`,
  });

  return global._firebaseAdminApp;
}

/* -------------------------------------------------------
   Modern API Accessors
------------------------------------------------------- */
export const adminApp = getAdminApp();
export const adminDb = () => adminApp.firestore();
export const adminAuth = () => adminApp.auth();
export const adminStorage = () => adminApp.storage().bucket();

/* -------------------------------------------------------
   Backward Compatibility Exports
   (Fixes 94+ files without modifying them)
------------------------------------------------------- */
export const db = adminDb();           // old import: { db }
export const auth = adminAuth();       // old import: { auth }
export const storage = adminStorage(); // old import: { storage }
export const app = adminApp;           // old import: { app }

export { admin }; // old import: { admin }  🔥 REQUIRED

/* Additional aliases for rare imports */
export const adminDB = adminDb;        // Some files use { adminDB }
export const adminInstance = admin;    // Legacy alias
export const firebaseAdmin = admin;    // Legacy alias

/* -------------------------------------------------------
   FULL getFirebaseAdmin() (Fixes auth/session completely)
------------------------------------------------------- */
export function getFirebaseAdmin() {
  return {
    // Namespace + instance
    admin,
    app: adminApp,

    // REAL instances (important!)
    auth: adminAuth(),
    adminAuth: adminAuth(),

    db: adminDb(),
    adminDb: adminDb(),

    storage: adminStorage(),
    adminStorage: adminStorage(),

    // Factory functions
    getAuth: adminAuth,
    getDb: adminDb,
    getStorage: adminStorage,
  };
}
