import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  initializeAuth,
  indexedDBLocalPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

/* ============================================================
   ⚙️ FIREBASE CLIENT CONFIG
   All values are public-safe (NEXT_PUBLIC_*)
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
   🚀 INITIALIZE APP (Singleton Safe)
============================================================ */
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/* ============================================================
   🔐 AUTH INITIALIZATION
   ✅ Supports phone OTP + email auth + persistent login
============================================================ */
let auth;
try {
  // Use IndexedDB persistence (works better in Next.js/Edge)
  auth = initializeAuth(app, {
    persistence: indexedDBLocalPersistence,
  });
} catch {
  // Fallback if already initialized
  auth = getAuth(app);
}

// Fallback for environments that don’t support IndexedDB (SSR safety)
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    console.warn("⚠️ Browser persistence unavailable, using default session persistence.");
  });
}

/* ============================================================
   🧠 FIRESTORE + STORAGE CLIENTS
============================================================ */
export const db = getFirestore(app);
export const storage = getStorage(app);
export { auth };
