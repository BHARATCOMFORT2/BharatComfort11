import "server-only";
import * as admin from "firebase-admin";

/**
 * ✅ Firebase Admin Singleton (Netlify + Next.js Safe)
 * Prevents duplicate initialization across serverless functions or build steps.
 */

declare global {
  // eslint-disable-next-line no-var
  var _firebaseAdminApp: admin.app.App | undefined;
}

/* ============================================================
   🔐 PRIVATE KEY HANDLER
============================================================ */
function getPrivateKey(): string {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) throw new Error("❌ Missing FIREBASE_PRIVATE_KEY in env vars.");
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

/* ============================================================
   ⚙️ ENV VALIDATION
============================================================ */
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = getPrivateKey();

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("❌ Missing Firebase Admin credentials in environment variables.");
}

/* ============================================================
   🚀 INITIALIZE ADMIN (Once per Function Scope)
============================================================ */
let app: admin.app.App;

if (admin.apps.length) {
  // Reuse existing app (safe reload)
  app = admin.app();
  console.log("♻️ Firebase Admin reused existing instance");
} else {
  // Initialize new app (first time only)
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket: `${projectId}.appspot.com`,
  });
  console.log("✅ Firebase Admin initialized");
}

/* ============================================================
   🔥 SERVICES
============================================================ */
export const adminApp = app;
export const adminAuth = admin.auth(app);
export const adminDb = admin.firestore(app);
export const adminStorage = admin.storage(app);

/* ============================================================
   🧩 ACCESSOR FUNCTION
============================================================ */
export function getFirebaseAdmin() {
  return { admin, adminApp, adminAuth, adminDb, adminStorage };
}

/* ============================================================
   💾 LEGACY EXPORTS (Backward Compatibility)
   👉 Keeps old imports working, e.g. { admin }, { db }, { storage }
============================================================ */
export { admin };               // Fixes "Attempted import error: 'admin'..."
export const db = adminDb;      // Some routes import { db }
export const storage = adminStorage; // Fixes "Attempted import error: 'storage'..."

/* ============================================================
   🧠 DEV CONNECTION CHECK
============================================================ */
if (process.env.NODE_ENV !== "production") {
  (async () => {
    try {
      await adminDb.listCollections();
      console.log("✅ Firestore Admin connected (dev check)");
    } catch (err: any) {
      console.error("⚠️ Firestore Admin connection issue:", err.message);
    }
  })();
}
