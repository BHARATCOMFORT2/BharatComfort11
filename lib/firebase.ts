// lib/firebase.ts
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

// ✅ AUTH
export const auth = getAuth(app);

// ✅ STORAGE (normal)
export const storage = getStorage(app);

// ✅ FIRESTORE — ADMIN ROUTES PAR DISABLE
let firestoreInstance: any = null;

if (typeof window !== "undefined") {
  const path = window.location.pathname || "";

  // 🛑 Admin area ke liye Firestore off
  if (!path.startsWith("/admin")) {
    firestoreInstance = getFirestore(app);
  }
}

// 👉 Baaki code me import { db } from "@/lib/firebase";
//    /admin me db === null hoga, baaki sab jagah real Firestore
export const db = firestoreInstance;
