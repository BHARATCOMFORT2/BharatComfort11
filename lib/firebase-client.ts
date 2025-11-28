// lib/firebase-client.ts

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, // optional but recommended
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, // optional
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID, // optional
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ✅ AUTH
export const auth = getAuth(app);

// ✅ FIRESTORE (THIS FIXES YOUR ERROR)
export const db = getFirestore(app);
