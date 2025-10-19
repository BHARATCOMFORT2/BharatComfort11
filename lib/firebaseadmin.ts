// lib/firebaseadmin.ts
import * as admin from "firebase-admin";

let app: admin.app.App;

// 🧩 Function to normalize private key format
function formatPrivateKey(key?: string): string | undefined {
  if (!key) return undefined;

  // Case 1: key already multiline — looks correct
  if (key.includes("-----BEGIN PRIVATE KEY-----") && key.includes("\n")) {
    return key;
  }

  // Case 2: key stored as a single line with \n escapes — fix it
  return key.replace(/\\n/g, "\n");
}

// 🧠 Extract environment variables
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

// 🧾 Validation and logging (helps debug on Netlify)
if (!projectId || !clientEmail || !privateKey) {
  console.error("❌ Firebase Admin missing environment vars:", {
    hasProjectId: !!projectId,
    hasClientEmail: !!clientEmail,
    hasPrivateKey: !!privateKey,
  });
  throw new Error("Missing Firebase Admin environment variables");
}

// 🔍 Show early warning if the private key looks broken
if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
  console.warn("⚠️ FIREBASE_PRIVATE_KEY is malformed (missing PEM header).");
}

console.log("✅ Firebase Admin initialization starting...");

// ✅ Initialize app safely
if (!admin.apps.length) {
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
} else {
  app = admin.app();
}

// Export Firestore + Auth clients
export const adminDb = admin.firestore();
export const adminAuth = admin.auth();

export function getFirebaseAdmin() {
  return { admin, app, adminDb, adminAuth };
}

console.log("✅ Firebase Admin loaded successfully");
