// lib/firebaseadmin.ts
import "server-only";
import * as admin from "firebase-admin";

declare global {
  // Prevent double initialization in dev/HMR
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
   - Supports FIREBASE_PRIVATE_KEY_BASE64
   - Supports FIREBASE_PRIVATE_KEY (escaped)
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
       ${!privateKey ? "FIREBASE_PRIVATE_KEY / _BASE64" : ""}`
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
   Admin SDK Instances
------------------------------------------------------- */
export const adminApp = getAdminApp();
export const adminDB = () => adminApp.firestore();
export const adminAuth = () => adminApp.auth();
export const adminStorage = () => adminApp.storage().bucket();

/* -------------------------------------------------------
   No more duplicate exports!
------------------------------------------------------- */
