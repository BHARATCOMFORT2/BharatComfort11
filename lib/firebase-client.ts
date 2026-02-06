// lib/firebase-client.ts
// ⚠️ Ye sirf CLIENT side par use hoga (React components, hooks, etc.)

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// 👇 Required env vars (auth + firestore ke liye)
// NEXT_PUBLIC_FIREBASE_API_KEY
// NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
// NEXT_PUBLIC_FIREBASE_PROJECT_ID
// NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
// NEXT_PUBLIC_FIREBASE_APP_ID
//
// ⚠️ NOTE:
// NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET env ab OPTIONAL hai
// kyunki hum storage ko explicit bucket ke saath init kar rahe hain

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

// ❗ Safe init (env missing hone par app crash nahi karega)
let app: FirebaseApp;

if (!getApps().length) {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error(
      "🔥 Firebase client config missing. Check NEXT_PUBLIC_FIREBASE_* env vars."
    );
  }
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// ✅ SINGLETON EXPORTS
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

// ✅ CRITICAL FIX: Explicit Storage Bucket
// (env newline / %0A / CORS issues completely avoided)
export const storage: FirebaseStorage = getStorage(
  app,
  "gs://bharatcomfort-46bac.firebasestorage.app"
);
