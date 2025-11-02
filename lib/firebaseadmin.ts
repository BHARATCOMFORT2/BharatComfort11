// lib/firebaseadmin.ts
import * as admin from "firebase-admin";

/* ============================================================
   🧠 FIREBASE ADMIN SINGLETON (Prevents Re-init in Netlify)
============================================================ */
let app: admin.app.App | undefined;

/* ============================================================
   🔐 PRIVATE KEY HANDLER — Works for both local & Netlify
============================================================ */
function resolvePrivateKey(): string {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) {
    throw new Error("❌ Missing FIREBASE_PRIVATE_KEY in environment variables.");
  }

  // Handle both escaped "\n" (Netlify) and normal formats (local)
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

/* ============================================================
   ⚙️ REQUIRED ENVIRONMENT VALIDATION
============================================================ */
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = resolvePrivateKey();

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("❌ Missing one or more Firebase Admin environment variables");
}

/* ============================================================
   🚀 INITIALIZE FIREBASE ADMIN (Singleton Safe)
============================================================ */
if (!admin.apps.length) {
  try {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: `${projectId}.appspot.com`,
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("✅ Firebase Admin initialized (server-side)");
    }
  } catch (err: any) {
    console.error("🔥 Firebase Admin initialization failed:", err.message);
    throw err;
  }
} else {
  app = admin.app();
}

/* ============================================================
   🔥 ADMIN SERVICES — Use only server-side
============================================================ */
export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminStorage = admin.storage();

/* ============================================================
   🧩 HELPER FUNCTION — Unified Accessor
============================================================ */
export function getFirebaseAdmin() {
  return {
    admin,
    app,
    adminAuth,
    adminDb,
    adminStorage,
  };
}

/* ============================================================
   🧠 CONNECTION TEST (Dev Only)
============================================================ */
(async () => {
  try {
    await adminDb.listCollections();
    if (process.env.NODE_ENV !== "production") {
      console.log("✅ Firestore Admin connection verified");
    }
  } catch (err: any) {
    console.error("⚠️ Firestore Admin connection issue:", err.message);
  }
})();
