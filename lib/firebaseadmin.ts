import "server-only";
import * as admin from "firebase-admin";

declare global {
  var _firebaseAdminApp: admin.app.App | undefined;
}

/* -------------------------------------------------------
   Safe ENV reader
------------------------------------------------------- */
function getEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`❌ Missing environment variable: ${name}`);
  }
  return v;
}

/* -------------------------------------------------------
   Private key loader (BASE64 + RAW supported)
------------------------------------------------------- */
function getPrivateKey(): string {
  const base64Key = process.env.FIREBASE_PRIVATE_KEY_BASE64;

  if (base64Key && base64Key.trim() !== "") {
    return Buffer.from(base64Key, "base64").toString("utf8");
  }

  const rawKey = getEnv("FIREBASE_PRIVATE_KEY");
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

  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;

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
   ✅ REAL INSTANCES (SAFE & CORRECT)
------------------------------------------------------- */
export const adminApp = getAdminApp();
export const adminDb = adminApp.firestore();
export const adminAuth = adminApp.auth();

/**
 * ✅ THIS IS THE CRITICAL FIX:
 * We export STORAGE SERVICE, not bucket
 */
export const adminStorage = adminApp.storage(); // ✅ CORRECT

/* -------------------------------------------------------
   ✅ Backward compatibility (safe)
------------------------------------------------------- */
export const db = adminDb;
export const auth = adminAuth;
export const app = adminApp;
export const storage = adminStorage;

export { admin };

/* -------------------------------------------------------
   ✅ Single unified bundle (safe everywhere)
------------------------------------------------------- */
export function getFirebaseAdmin() {
  return {
    admin,
    app: adminApp,

    db: adminDb,
    adminDb,

    auth: adminAuth,
    adminAuth,

    storage: adminStorage,   // ✅ service
    adminStorage,
  };
}
