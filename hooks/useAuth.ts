"use client";

import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  User as FirebaseUser,
  signOut as firebaseSignOut,
  sendEmailVerification,
  getIdToken,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

/* ============================================================
   ✉️ Helper: Send Email Verification
============================================================ */
export async function sendVerificationEmail(): Promise<boolean> {
  if (auth.currentUser && !auth.currentUser.emailVerified) {
    await sendEmailVerification(auth.currentUser, {
      url:
        process.env.NEXT_PUBLIC_APP_URL ||
        `${window.location.origin}/auth/verify-email`,
    });
    return true;
  }
  return false;
}

/* ============================================================
   🧩 Interface
============================================================ */
export interface AppUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  role?: "user" | "partner" | "staff" | "admin" | "superadmin";
  verified?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  status?: "active" | "pending" | "blocked" | "approved";
  preferences?: Record<string, any>;
  [key: string]: any;
}

/* ============================================================
   🔥 Hook: useAuth()
   - Syncs Firebase auth state + Firestore user profile
   - Keeps session cookie in sync with backend
============================================================ */
export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setLoading(true);

      if (user) {
        try {
          // Fetch Firestore user document
          const userRef = doc(db, "users", user.uid);
          const snap = await getDoc(userRef);

          let userData: AppUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: "user",
          };

          if (snap.exists()) {
            userData = { ...userData, ...(snap.data() as AppUser) };
          }

          setProfile(userData);

          // 🔁 Ensure server session cookie is valid
          try {
            const token = await getIdToken(user, true);
            await fetch("/api/auth/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            });
          } catch (err) {
            console.warn("⚠️ Failed to sync session cookie:", err);
          }
        } catch (err) {
          console.error("❌ Error fetching Firestore user:", err);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /* ------------------------------------------------------------
     🚪 Logout → Clear Firebase + Session Cookie
  ------------------------------------------------------------ */
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      await fetch("/api/auth/logout", { method: "POST" }); // clear session cookie
    } catch (err) {
      console.error("⚠️ Sign out failed:", err);
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
    sendVerificationEmail,
    isVerified:
      profile?.emailVerified && profile?.phoneVerified && profile?.verified,
  };
}
