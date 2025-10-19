// lib/firebaseadmin.ts
import * as admin from "firebase-admin";

let app: admin.app.App;

/* --------------------------------------------------
   🔐 Helper: Format or Decode Private Key
-------------------------------------------------- */
function resolvePrivateKey(): string | undefined {
  const base64Key = process.env.FIREBASE_PRIVATE_KEY_BASE64;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;

  // 🧩 1️⃣ If Base64 version exists, decode it
  if (base64Key) {
    try {
      const decoded = Buffer.from(base64Key, "base64").toString("utf8");
      if (decoded.includes("-----BEGIN PRIVATE KEY-----")) {
        console.log("✅ Using Base64-decoded FIREBASE_PRIVATE_KEY_BASE64");
        return decoded;
      } else {
        console.warn("⚠️ Base64 decoded key does not look like a valid PEM file.");
        return decoded;
      }
    } catch (err) {
      console.error("❌ Failed to decode FIREBASE_PRIVATE_KEY_BASE64:", err);
    }
  }

  // 🧩 2️⃣ Otherwise, use the normal PEM or escaped version
  if (rawKey) {
    if (rawKey.includes("\\n")) {
      console.log("✅ Using FIREBASE_PRIVATE_KEY with escaped \\n newlines");
      return rawKey.replace(/\\n/g, "\n");
    }
    if (rawKey.includes("-----BEGIN PRIVATE KEY-----")) {
      console.log("✅ Using FIREBASE_PRIVATE_KEY with proper PEM format");
      return rawKey;
    }
  }

  console.error("❌ No valid FIREBASE_PRIVATE_KEY or FIREBASE_PRIVATE_KEY_BASE64 found!");
  return undefined;
}

/* --------------------------------------------------
   🧠 Extract and Validate Environment Variables
-------------------------------------------------- */
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = resolvePrivateKey();

if (!projectId || !clientEmail || !privateKey) {
  console.error("❌ Missing Firebase Admin credentials:", {
    hasProjectId: !!projectId,
    hasClientEmail: !!clientEmail,
    hasPrivateKey: !!privateKey,
  });
  throw new Error("Firebase Admin environment variables are missing or invalid");
}

console.log("✅ Firebase Admin initialization starting...");

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
  console.log("ℹ️ Firebase Admin already initialized");
}

/* --------------------------------------------------
   🧩 Export Utilities
-------------------------------------------------- */
export const adminDb = admin.firestore();
export const adminAuth = admin.auth();

export function getFirebaseAdmin() {
  return { admin, app, adminDb, adminAuth };
}

/* --------------------------------------------------
   ✅ Optional: Verify connection at startup
-------------------------------------------------- */
(async () => {
  try {
    await adminDb.listCollections();
    console.log("✅ Firebase Admin Firestore connection verified");
  } catch (err) {
    console.error("🔥 Firebase Admin Firestore connection failed:", err);
  }
})();
