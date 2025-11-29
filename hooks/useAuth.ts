"use client";

import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  User as FirebaseUser,
  signOut as firebaseSignOut,
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
        // ✅ 1️⃣ USERS FIRST (ADMIN CHECK HIGHEST PRIORITY)
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
          const userData = userSnap.data();

          // ✅ IF ADMIN FOUND → RETURN IMMEDIATELY
          if (userData.role === "admin" || userData.role === "superadmin") {
            setProfile({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              role: userData.role,
              ...userData,
            });

            const token = await getIdToken(user, true);
            await fetch("/api/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            });

            setLoading(false);
            return;
          }
        }

        // ✅ 2️⃣ STAFF
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

        // ✅ 3️⃣ PARTNER
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

        // ✅ 4️⃣ NORMAL USER FALLBACK
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
