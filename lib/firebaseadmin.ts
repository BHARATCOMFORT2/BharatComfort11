// lib/firebaseadmin.ts
import * as admin from "firebase-admin";

let app: admin.app.App | undefined;

/* --------------------------------------------------
   🔐 Resolve Private Key (supports both escaped & raw)
-------------------------------------------------- */
function resolvePrivateKey(): string {
  const key = process.env.FIREBASE_PRIVATE_KEY;

  if (!key) {
    throw new Error("❌ FIREBASE_PRIVATE_KEY missing from environment variables");
  }

  const formatted = key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;

  if (!formatted.includes("BEGIN PRIVATE KEY")) {
    throw new Error("❌ FIREBASE_PRIVATE_KEY format invalid (missing BEGIN PRIVATE KEY)");
  }

  return formatted;
}

/* --------------------------------------------------
   🧠 Validate Required Environment Variables
-------------------------------------------------- */
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = resolvePrivateKey();

if (!projectId || !clientEmail) {
  throw new Error("❌ Missing Firebase Admin environment variables: projectId/clientEmail");
}

/* --------------------------------------------------
   🚀 Initialize Firebase Admin (singleton-safe)
-------------------------------------------------- */
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
      console.log("✅ Firebase Admin initialized (dev mode)");
    }
  } catch (err: any) {
    console.error("🔥 Firebase Admin initialization failed:", err.message);
    throw err;
  }
} else {
  app = admin.app();
}

/* --------------------------------------------------
   🧩 Exports (Admin SDK instances)
-------------------------------------------------- */
export const adminAuth = admin.auth();
export const adminDb = admin.firestore();

/**
 * Unified getter to access Admin services safely
 */
export function getFirebaseAdmin() {
  return { admin, app, adminAuth, adminDb };
}

/* --------------------------------------------------
   ✅ Optional Firestore Connectivity Check
   (Silent in production to avoid console spam)
-------------------------------------------------- */
(async () => {
  try {
    await adminDb.listCollections();
    if (process.env.NODE_ENV !== "production") {
      console.log("✅ Firebase Admin Firestore connection verified");
    }
  } catch (err: any) {
    console.error("⚠️ Firestore connectivity issue:", err.message);
    // Retry once after a delay (handles cold starts)
    setTimeout(async () => {
      try {
        await adminDb.listCollections();
        console.log("✅ Firestore connection re-established");
      } catch {
        console.error("🔥 Firestore still unreachable after retry");
      }
    }, 2000);
  }
})();
