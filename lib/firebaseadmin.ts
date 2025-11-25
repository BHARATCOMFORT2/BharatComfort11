import "server-only";
import * as admin from "firebase-admin";

declare global {
  var _firebaseAdminApp: admin.app.App | undefined;
}

/* -------------------------------------------------------
   Get env var safely
------------------------------------------------------- */
function getEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v : undefined;
}

/* -------------------------------------------------------
   Private key loader
------------------------------------------------------- */
function getPrivateKey(): string {
  const base64Key = getEnv("FIREBASE_PRIVATE_KEY_BASE64");

  if (base64Key) {
    return Buffer.from(base64Key, "base64").toString("utf8");
  }

  const rawKey = getEnv("FIREBASE_PRIVATE_KEY");
  if (!rawKey) {
    throw new Error("❌ Missing Firebase private key");
  }

  return rawKey.replace(/\\n/g, "\n");
}

/* -------------------------------------------------------
   SAFE SINGLETON INITIALIZATION
------------------------------------------------------- */
export function getAdminApp(): admin.app.App {
  if (global._firebaseAdminApp) return global._firebaseAdminApp;

  const projectId = getEnv("FIREBASE_PROJECT_ID");
  const clientEmail = getEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("❌ Missing Firebase Admin environment variables");
  }

  // THE FIX IS HERE 👇
  const storageBucket =
    getEnv("FIREBASE_STORAGE_BUCKET") || `${projectId}.appspot.com`;

  global._firebaseAdminApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket,
  });

  return global._firebaseAdminApp;
}

/* -------------------------------------------------------
   REAL instances (correct way)
------------------------------------------------------- */
export const adminApp = getAdminApp();
export const adminDb = adminApp.firestore();
export const adminAuth = adminApp.auth();
export const adminStorage = adminApp.storage().bucket();

/* -------------------------------------------------------
   Backward compatibility
------------------------------------------------------- */
export const db = adminDb;
export const auth = adminAuth;
export const storage = adminStorage;
export const app = adminApp;

export { admin };

export const firebaseAdmin = admin;
export const adminInstance = admin;
export const adminSDK = admin;
export const adminDefault = admin;

/* -------------------------------------------------------
   Bundle for `getFirebaseAdmin()`
------------------------------------------------------- */
export function getFirebaseAdmin() {
  return {
    admin,

    app: adminApp,

    db: adminDb,
    adminDb,

    auth: adminAuth,
    adminAuth,

    storage: adminStorage,
    adminStorage,
  };
}
