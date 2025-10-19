// lib/firebaseadmin.ts
import * as admin from "firebase-admin";

let app: admin.app.App;

/* --------------------------------------------------
   🔐 Resolve Private Key (Plain Text, with \n Escapes)
-------------------------------------------------- */
function resolvePrivateKey(): string {
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!rawKey) {
    throw new Error("❌ FIREBASE_PRIVATE_KEY is missing from environment variables");
  }

  // Replace literal \n with real newlines (needed for Netlify)
  const formattedKey = rawKey.replace(/\\n/g, "\n");

  if (!formattedKey.startsWith("-----BEGIN PRIVATE KEY-----")) {
    throw new Error("❌ FIREBASE_PRIVATE_KEY format invalid — ensure \\n are used, not real newlines.");
  }

  return formattedKey;
}

/* --------------------------------------------------
   🧠 Validate Required Variables
-------------------------------------------------- */
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = resolvePrivateKey();

if (!projectId || !clientEmail) {
  throw new Error("❌ Firebase Admin environment variables missing (projectId/clientEmail)");
}

/* --------------------------------------------------
   🚀 Initialize Firebase Admin App
-------------------------------------------------- */
if (!admin.apps.length) {
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  console.log("✅ Firebase Admin initialized successfully");
} else {
  app = admin.app();
}

/* --------------------------------------------------
   🧩 Exports
-------------------------------------------------- */
export const adminDb = admin.firestore();
export const adminAuth = admin.auth();

export function getFirebaseAdmin() {
  return { admin, app, adminDb, adminAuth };
}

/* --------------------------------------------------
   ✅ Verify Firestore Connection (Optional)
   - You can comment this out for production
-------------------------------------------------- */
(async () => {
  try {
    await adminDb.listCollections();
    console.log("✅ Firebase Admin Firestore connection verified");
  } catch (err) {
    console.error("🔥 Firebase Admin Firestore connection failed:", err);
  }
})();
