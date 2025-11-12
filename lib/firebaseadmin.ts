import "server-only";
import * as admin from "firebase-admin";

/**
 * ✅ Firebase Admin Singleton (Next.js + Netlify Safe)
 * Prevents duplicate initialization across edge/serverless invocations.
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
  if (!key) throw new Error("❌ Missing FIREBASE_PRIVATE_KEY in environment variables.");
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
   🚀 INITIALIZE ADMIN (Once Per Function Scope)
============================================================ */
let app: admin.app.App;

try {
  if (global._firebaseAdminApp) {
    app = global._firebaseAdminApp;
    console.log("♻️ Firebase Admin reused global instance");
  } else if (admin.apps.length) {
    app = admin.app();
    global._firebaseAdminApp = app;
    console.log("♻️ Firebase Admin reused existing app instance");
  } else {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: `${projectId}.appspot.com`,
    });
    global._firebaseAdminApp = app;
    console.log("✅ Firebase Admin initialized");
  }
} catch (error: any) {
  console.error("🔥 Firebase Admin initialization failed:", error.message);
  throw error;
}

/* ============================================================
   🔥 SERVICES
============================================================ */
const adminAuth = admin.auth(app);
const firestoreAdmin = admin.firestore(app);
const adminStorage = admin.storage(app);

/* ============================================================
   🧩 EXPORTS
============================================================ */
export { admin };
export const db = firestoreAdmin;
export const adminDb = firestoreAdmin; // alias for compatibility
export const authAdmin = adminAuth;
export const storage = adminStorage;

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
