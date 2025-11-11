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
  app = admin.app();
  console.log("♻️ Firebase Admin reused existing instance");
} else {
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
const adminAuth = admin.auth(app);
const firestoreAdmin = admin.firestore(app);
const adminStorage = admin.storage(app);

/* ============================================================
   🧩 ACCESSOR FUNCTION (if needed elsewhere)
============================================================ */
export function getFirebaseAdmin() {
  return {
    admin,
    adminApp: app,
    adminAuth,
    db: firestoreAdmin,
    storage: adminStorage,
  };
}

/* ============================================================
   💾 UNIVERSAL EXPORTS (Safe Global Imports)
============================================================ */
export { admin };

export const db = firestoreAdmin;
export const adminDb = firestoreAdmin; // ✅ alias for compatibility
export const authAdmin = adminAuth;
export const storage = adminStorage;

/* ============================================================
   🧠 DEV CONNECTION CHECK (for local debugging)
============================================================ */
if (process.env.NODE_ENV !== "production") {
  (async () => {
    try {
      await firestoreAdmin.listCollections();
      console.log("✅ Firestore Admin connected (dev check)");
    } catch (err: any) {
      console.error("⚠️ Firestore Admin connection issue:", err.message);
    }
  })();
}
