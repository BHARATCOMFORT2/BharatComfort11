// lib/firebase-client.ts

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

/* -------------------------------------------------------
   ✅ ENV SAFETY CHECK (NO SILENT FAIL)
------------------------------------------------------- */
function getEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`❌ Missing environment variable: ${name}`);
  }
  return v;
}

/* -------------------------------------------------------
   ✅ FIREBASE CONFIG (FINAL & SAFE)
------------------------------------------------------- */
const firebaseConfig = {
  apiKey: getEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain: getEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),

  // 🔥🔥🔥 MOST IMPORTANT — TUMHARA REAL BUCKET
  storageBucket: getEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  
  messagingSenderId: getEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
};

/* -------------------------------------------------------
   ✅ SINGLETON APP INITIALIZATION
------------------------------------------------------- */
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/* -------------------------------------------------------
   ✅ SINGLETON EXPORTS
------------------------------------------------------- */
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
