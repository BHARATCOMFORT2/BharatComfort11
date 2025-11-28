"use client";

import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  User as FirebaseUser,
  signOut as firebaseSignOut,
  sendEmailVerification,
  getIdToken,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase-client";
import { doc, getDoc } from "firebase/firestore";

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
        // ✅ 1️⃣ CHECK STAFF FIRST
        const staffSnap = await getDoc(doc(db, "staff", user.uid));
        if (staffSnap.exists()) {
          const staffData = staffSnap.data();
          setProfile({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: "staff",
            ...staffData,
          });

          setLoading(false);
          return;
        }

        // ✅ 2️⃣ CHECK PARTNERS
        const partnerSnap = await getDoc(doc(db, "partners", user.uid));
        if (partnerSnap.exists()) {
          const partnerData = partnerSnap.data();
          setProfile({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: "partner",
            ...partnerData,
          });

          setLoading(false);
          return;
        }

        // ✅ 3️⃣ OTHERWISE NORMAL USER
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
          setProfile({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: userSnap.data().role || "user",
            ...userSnap.data(),
          });
        } else {
          setProfile({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: "user",
          });
        }

        // ✅ SESSION COOKIE SYNC
        const token = await getIdToken(user, true);
        await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
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
