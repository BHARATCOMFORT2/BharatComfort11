import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  setPersistence,
  Auth,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

/* ============================================================
   ⚙️ FIREBASE CLIENT CONFIG
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
   🚀 Initialize App (Singleton Safe)
============================================================ */
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/* ============================================================
   🔐 AUTH INITIALIZATION (Safe Typed)
============================================================ */
let authInstance: Auth;

try {
  authInstance = initializeAuth(app, {
    persistence: indexedDBLocalPersistence,
  });
} catch {
  authInstance = getAuth(app);
}

// Ensure persistent login
if (typeof window !== "undefined") {
  setPersistence(authInstance, browserLocalPersistence).catch(() => {
    console.warn("⚠️ Browser persistence unavailable, fallback to session persistence.");
  });
}

/* ============================================================
   🧩 FIRESTORE + STORAGE (Typed Exports)
============================================================ */
export const auth: Auth = authInstance;
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
