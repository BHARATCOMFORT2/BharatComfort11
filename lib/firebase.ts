// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

/* ============================================================
   🔧 FIREBASE CLIENT CONFIGURATION (uses NEXT_PUBLIC_ vars)
============================================================ */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

/* ============================================================
   🚀 SINGLETON INITIALIZATION
============================================================ */
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

/* ============================================================
   🔐 FIREBASE SERVICES (Client-Side)
============================================================ */
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Optional named export for debugging
export { app };
