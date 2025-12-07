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

// ✅ AUTH + STORAGE normal
export const auth = getAuth(app);
export const storage = getStorage(app);

/**
 * 🛑🔥 HARD FIRESTORE BYPASS
 * Koi network call nahi
 * Koi Listen RPC nahi
 * Koi Permission error nahi
 */
const fireStoreBypass = new Proxy(
  {},
  {
    get() {
      return () => {
        console.warn("🛑 Firestore bypass active — call ignored");
        return Promise.resolve(null);
      };
    },
  }
);

let firestoreInstance: any = fireStoreBypass;

if (typeof window !== "undefined") {
  const path = window.location.pathname || "";

  // ✅ Sirf NON-admin areas me real Firestore allow
  if (!path.startsWith("/admin")) {
    firestoreInstance = getFirestore(app);
  } else {
    console.warn("🚫 Firestore completely bypassed on admin routes");
  }
}

export const db = firestoreInstance;
