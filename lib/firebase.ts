// firebase.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import {
  getAuth,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

/* ---------------------------------------------------------
   🔥 CLIENT CONFIG
--------------------------------------------------------- */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

/* ---------------------------------------------------------
   🚀 Initialize Firebase (Singleton)
--------------------------------------------------------- */
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

/* ---------------------------------------------------------
   🔐 AUTH (Stable & SIMPLE)
--------------------------------------------------------- */
export const auth = getAuth(app);

if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn("⚠️ Persistence error:", err);
  });
}

/* ---------------------------------------------------------
   🗄 FIRESTORE / STORAGE
--------------------------------------------------------- */
export const db = getFirestore(app);
export const storage = getStorage(app);
