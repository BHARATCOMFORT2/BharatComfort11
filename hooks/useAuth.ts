"use client";

import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  User as FirebaseUser,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase-client";

/* ----------------------------------------
   TYPES
---------------------------------------- */
export interface AppUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  role?: "user" | "partner" | "staff" | "admin" | "superadmin";
  status?: string;
  emailVerified?: boolean;
  isActive?: boolean;
  [key: string]: any;
}

/* ----------------------------------------
   HOOK
---------------------------------------- */
export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  /* ----------------------------------------
     AUTH STATE LISTENER
  ---------------------------------------- */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        /* ----------------------------------------
           1️⃣ GET FRESH ID TOKEN
        ---------------------------------------- */
        const token = await user.getIdToken(true);

        if (!token) {
          throw new Error("Missing ID token");
        }

        /* ----------------------------------------
           2️⃣ CREATE SESSION COOKIE
        ---------------------------------------- */
        await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        /* ----------------------------------------
           3️⃣ LOAD USER PROFILE (ADMIN SDK)
        ---------------------------------------- */
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await res.json();

        if (!data?.success || !data.user) {
          throw new Error("Invalid profile response");
        }

        setProfile({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          ...data.user, // role, status, permissions
        });
      } catch (err) {
        console.error("❌ Auth init failed:", err);
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /* ----------------------------------------
     SIGN OUT
  ---------------------------------------- */
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      await fetch("/api/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      document.cookie = "__session=; Max-Age=0; path=/;";
      setFirebaseUser(null);
      setProfile(null);
    }
  };

  /* ----------------------------------------
     🔑 SAFE TOKEN GETTER (USE THIS EVERYWHERE)
  ---------------------------------------- */
  const getAuthToken = async () => {
    if (!firebaseUser) return null;
    return await firebaseUser.getIdToken(true);
  };

  return {
    firebaseUser,   // 🔑 ONLY source for uploads token
    profile,        // UI / role / dashboard
    loading,        // MUST check before API calls
    signOut,
    getAuthToken,   // ⭐ use this in uploads / protected APIs
  };
}
