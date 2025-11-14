import "server-only";
import * as admin from "firebase-admin";

declare global {
  // eslint-disable-next-line no-var
  var _firebaseAdminApp: admin.app.App | undefined;
}

function getAdminApp(): admin.app.App {
  if (global._firebaseAdminApp) return global._firebaseAdminApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawKey) {
    throw new Error("❌ Missing Firebase Admin credentials");
  }

  const privateKey = rawKey.replace(/\\n/g, "\n");

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

// ---- SINGLETONS ----
const app = getAdminApp();
const db = admin.firestore(app);
const auth = admin.auth(app);
const storage = admin.storage(app);

// ---- EXPORTS + COMPATIBILITY LAYERS ----
export {
  admin,
  app,
  db,
  auth,
  storage,

  // compatibility exports
  app as adminApp,
  db as adminDb,
  auth as authAdmin,
  auth as adminAuth,
  storage as adminStorage,
};

// Accessor (optional)
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
    adminAuth: auth,
    adminStorage: storage,
  };
}
