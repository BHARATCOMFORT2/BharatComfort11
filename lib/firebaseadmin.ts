import "server-only";
import * as admin from "firebase-admin";

/** 
 * 🔥 Global Singleton Fix (Required for Vercel)
 * Prevents “Firebase app already exists” in serverless.
 */
declare global {
  // eslint-disable-next-line no-var
  var _firebaseAdmin: admin.app.App | undefined;
}

function getAdminApp(): admin.app.App {
  if (global._firebaseAdmin) {
    return global._firebaseAdmin;
  }

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

const app = getAdminApp();
const db = admin.firestore(app);
const auth = admin.auth(app);
const storage = admin.storage(app);

export { admin, app, db, auth, storage };
