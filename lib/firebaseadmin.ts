// lib/firebaseadmin.ts
import * as admin from "firebase-admin";

/* ============================================================
   🧠 SINGLETON INITIALIZATION (Avoid re-initialization)
============================================================ */
let app: admin.app.App | undefined;

/* ============================================================
   🔐 PRIVATE KEY HANDLER (escaped or normal format)
============================================================ */
function resolvePrivateKey(): string {
  const key = process.env.FIREBASE_PRIVATE_KEY;

  if (!key) throw new Error("❌ FIREBASE_PRIVATE_KEY missing from environment variables");

  // Handles escaped "\n" from Netlify or normal format
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

/* ============================================================
   ⚙️ VALIDATE REQUIRED ENVIRONMENT VARIABLES
============================================================ */
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = resolvePrivateKey();

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("❌ Missing Firebase Admin environment variables");
}

/* ============================================================
   🚀 INITIALIZE FIREBASE ADMIN (Singleton-safe)
============================================================ */
if (!admin.apps.length) {
  try {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    if (process.env.NODE_ENV !== "production") {
      console.log("✅ Firebase Admin initialized (server-side)");
    }
  } catch (err: any) {
    console.error("🔥 Firebase Admin init failed:", err.message);
    throw err;
  }
} else {
  app = admin.app();
}

/* ============================================================
   🔥 ADMIN SERVICES (For API Routes Only)
============================================================ */
export const adminAuth = admin.auth();
export const adminDb = admin.firestore();

/* ============================================================
   🧩 HELPER — Unified getter
============================================================ */
export function getFirebaseAdmin() {
  return { admin, app, adminAuth, adminDb };
}

/* ============================================================
   🧠 CONNECTION TEST (Optional)
============================================================ */
(async () => {
  try {
    await adminDb.listCollections();
    if (process.env.NODE_ENV !== "production") {
      console.log("✅ Firestore Admin connection verified");
    }
  } catch (err: any) {
    console.error("⚠️ Firestore connection issue:", err.message);
  }
})();
