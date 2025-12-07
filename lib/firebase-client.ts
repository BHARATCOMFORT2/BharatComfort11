// lib/firebase-client.ts

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ✅ AUTH (always ON)
export const auth = getAuth(app);

// ✅ STORAGE (always ON)
export const storage = getStorage(app);

// ✅ FIRESTORE — ADMIN ROUTES PAR HARD OFF
let firestoreInstance: any = null;

if (typeof window !== "undefined") {
  const path = window.location.pathname || "";

  // 🛑 Admin area me Firestore bilkul band
  if (!path.startsWith("/admin")) {
    firestoreInstance = getFirestore(app);
  } else {
    console.warn("🚫 Firestore disabled on admin routes");
  }
}

// 👉 Admin pages par `db === null` rahega
export const db = firestoreInstance;
