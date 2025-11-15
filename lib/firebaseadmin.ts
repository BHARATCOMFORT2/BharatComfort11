// lib/firebaseadmin.ts
import "server-only";
import * as admin from "firebase-admin";

declare global {
  // Prevent double initialization in Next.js dev/HMR
  // eslint-disable-next-line no-var
  var _firebaseAdminApp: admin.app.App | undefined;
}

/* -------------------------------------------------------
   Helper: Get environment variable cleanly
------------------------------------------------------- */
function getEnvVar(name: string): string | undefined {
  const v = process.env[name];
  if (!v || v.trim() === "") return undefined;
  return v;
}

/* -------------------------------------------------------
   Helper: Load private key (supports BASE64 + escaped)
------------------------------------------------------- */
function getPrivateKey(): string {
  // 1) BASE64 private key (preferred for Netlify/Vercel)
  const base64Key = getEnvVar("FIREBASE_PRIVATE_KEY_BASE64");
  if (base64Key) {
    try {
      return Buffer.from(base64Key, "base64").toString("utf8");
    } catch {
      throw new Error("FIREBASE_PRIVATE_KEY_BASE64 is invalid base64.");
    }
  }

  // 2) Escaped private key
  const rawKey = getEnvVar("FIREBASE_PRIVATE_KEY");
  if (!rawKey) {
    throw new Error(
      "Missing Firebase private key. Provide FIREBASE_PRIVATE_KEY or FIREBASE_PRIVATE_KEY_BASE64"
    );
  }

  // Convert escaped newlines → real newlines
  return rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;
}

/* -------------------------------------------------------
   Initialize Firebase Admin SDK (SAFE SINGLETON)
------------------------------------------------------- */
export function getAdminApp(): admin.app.App {
  if (global._firebaseAdminApp) return global._firebaseAdminApp;

  const projectId = getEnvVar("FIREBASE_PROJECT_ID");
  const clientEmail = getEnvVar("FIREBASE_CLIENT_EMAIL");
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    const missing = [
      projectId ? null : "FIREBASE_PROJECT_ID",
      clientEmail ? null : "FIREBASE_CLIENT_EMAIL",
      privateKey ? null : "FIREBASE_PRIVATE_KEY / FIREBASE_PRIVATE_KEY_BASE64",
    ]
      .filter(Boolean)
      .join(", ");

    throw new Error(`❌ Missing Firebase Admin env variables: ${missing}`);
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
   SINGLETONS (ALWAYS SAFE)
------------------------------------------------------- */
export const adminApp = getAdminApp();
export const adminAuth = adminApp.auth();
export const adminDb = adminApp.firestore();
export const adminStorage = adminApp.storage().bucket();

/* -------------------------------------------------------
   Backward compatibility: support old import style
------------------------------------------------------- */
export const auth = adminAuth;
export const db = adminDb;
export const storage = adminStorage;
export const app = adminApp;

/* -------------------------------------------------------
   getFirebaseAdmin() wrapper (optional)
------------------------------------------------------- */
export function getFirebaseAdmin() {
  return {
    admin,
    app: adminApp,
    db: adminDb,
    auth: adminAuth,
    storage: adminStorage,

    // compatibility export naming
    adminApp,
    adminDb,
    adminAuth,
    adminStorage,
  };
}
