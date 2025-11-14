import "server-only";
import * as admin from "firebase-admin";

/**
 * 🔥 GLOBAL SINGLETON (Vercel-safe)
 */
declare global {
  // eslint-disable-next-line no-var
  var _firebaseAdmin: admin.app.App | undefined;
}

/**
 * 🔐 Initialize ONLY once (serverless safe)
 */
function getAdminApp(): admin.app.App {
  if (global._firebaseAdmin) return global._firebaseAdmin;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawKey) {
    throw new Error("❌ Missing Firebase Admin credentials");
  }

  const privateKey = rawKey.replace(/\\n/g, "\n");

  global._firebaseAdmin = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket: `${projectId}.appspot.com`,
  });

  return global._firebaseAdmin;
}

/**
 * 🚀 Create Singletons
 */
const app = getAdminApp();
const db = admin.firestore(app);
const auth = admin.auth(app);
const storage = admin.storage(app);

/**
 * ⭐ BACKWARD COMPATIBLE EXPORTS ⭐
 * So your entire project continues to work
 */
export {
  admin,       // firebase-admin namespace
  app,         // renamed "adminApp" previously
  db,          // firestore
  auth,        // auth
  storage,     // storage

  // BACKWARD COMPATIBILITY ALIASES
  app as adminApp,
  db as adminDb,
  auth as authAdmin,
  storage as adminStorage,
};

/**
 * 🧩 Optional accessor
 */
export function getFirebaseAdmin() {
  return {
    admin,
    app,
    db,
    auth,
    storage,
    adminApp: app,
    adminDb: db,
    authAdmin: auth,
    adminStorage: storage,
  };
}
