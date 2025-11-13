import * as admin from "firebase-admin";

declare global {
  // eslint-disable-next-line no-var
  var _adminApp: admin.app.App | undefined;
}

function getAdminApp(): admin.app.App {
  if (global._adminApp) return global._adminApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error("Missing Firebase Admin credentials.");
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  const app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket: `${projectId}.appspot.com`,
  });

  global._adminApp = app;
  return app;
}

/** Main export for API routes */
export function getFirebaseAdmin() {
  const app = getAdminApp();
  return {
    admin,
    app,
    db: admin.firestore(app),
    auth: admin.auth(app),
    storage: admin.storage(app),
  };
}
