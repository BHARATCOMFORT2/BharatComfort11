"use client";

import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  User as FirebaseUser,
  signOut as firebaseSignOut,
  getIdToken,
} from "firebase/auth";
import { auth } from "@/lib/firebase-client";

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

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setLoading(true);

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        // ✅ GET ID TOKEN
        const token = await getIdToken(user, true);

        // ✅ SEND TOKEN TO SERVER (SESSION SET)
        await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        // ✅ FETCH USER PROFILE FROM SERVER (ADMIN SDK)
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });

        const data = await res.json();

        if (!res.ok || !data?.success || !data.user) {
          throw new Error("Failed to load profile");
        }

        setProfile({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          ...data.user, // role, status, etc from server
        });
      } catch (err) {
        console.error("Auth profile fetch error:", err);
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      await fetch("/api/logout", { method: "POST" });
      document.cookie = "__session=; Max-Age=0; path=/;";
    } finally {
      setFirebaseUser(null);
      setProfile(null);
    }
  };

  return {
    firebaseUser,
    profile,
    loading,
    signOut,
  };
}
