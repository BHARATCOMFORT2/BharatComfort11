// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Use NEXT_PUBLIC_ env vars so they are available on client-side
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Avoid reinitializing app in Next.js (hot reload issue)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firebase services (named exports)
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Named export for app
export { app };

// ALSO provide a default export so older files that import default still work.
// This is the bypass to avoid having to change imports everywhere at once.
export default app;
