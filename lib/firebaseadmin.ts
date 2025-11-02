// lib/firebaseadmin.ts
import * as admin from "firebase-admin";

/* ============================================================
   🧠 FIREBASE ADMIN SINGLETON (Safe for Netlify / Vercel)
============================================================ */
declare global {
  // Prevent TypeScript from re-declaring this in hot reloads
  // eslint-disable-next-line no-var
  var _adminApp: admin.app.App | undefined;
}

/* ============================================================
   🔐 PRIVATE KEY HANDLER — Safe for both Local & Netlify
============================================================ */
function resolvePrivateKey(): string {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) {
    throw new Error("❌ Missing FIREBASE_PRIVATE_KEY in environment variables.");
  }

  // Fix escaped newline format used in Netlify/Render/etc.
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

/* ============================================================
   ⚙️ ENVIRONMENT VALIDATION
============================================================ */
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = resolvePrivateKey();

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("❌ Missing Firebase Admin environment configuration.");
}

/* ============================================================
   🚀 INITIALIZE (Once Only)
============================================================ */
export const adminApp =
  global._adminApp ??
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket: `${projectId}.appspot.com`,
  });

// ✅ Always cache instance globally — including production!
global._adminApp = adminApp;

/* ============================================================
   🔥 ADMIN SERVICES — Use only server-side
============================================================ */
export const adminAuth = admin.auth(adminApp);
export const adminDb = admin.firestore(adminApp);
export const adminStorage = admin.storage(adminApp);

/* ============================================================
   🧩 EXPORT UNIFIED ACCESSOR
============================================================ */
export function getFirebaseAdmin() {
  return { admin, adminApp, adminAuth, adminDb, adminStorage };
}

/* ============================================================
   🧠 CONNECTION TEST (Dev Only)
============================================================ */
if (process.env.NODE_ENV !== "production") {
  (async () => {
    try {
      await adminDb.listCollections();
      console.log("✅ Firestore Admin connection verified (dev)");
    } catch (err: any) {
      console.error("⚠️ Firestore Admin connection issue:", err.message);
    }
  })();
}
