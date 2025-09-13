"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { sendEmailVerification } from "firebase/auth";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import PhoneVerificationForm from "@/components/forms/PhoneVerificationForm";

export default function VerifyPage() {
  const [user, setUser] = useState<any>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [role, setRole] = useState("user");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (u) {
        setUser(u);
        setEmailVerified(u.emailVerified);

        // Get Firestore profile
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          const data = snap.data();
          setPhoneVerified(data.phoneVerified || false);
          setRole(data.role || "user");
        }
      }
    });
    return () => unsubscribe();
  }, []);

  async function sendVerification() {
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      await sendEmailVerification(auth.currentUser);
      alert("Verification email sent! Check your inbox.");
    }
  }

  async function markPhoneVerified() {
    if (user) {
      await updateDoc(doc(db, "users", user.uid), { phoneVerified: true });
      setPhoneVerified(true);
    }
  }

  async function markActive() {
    if (user && (emailVerified || phoneVerified)) {
      await updateDoc(doc(db, "users", user.uid), { isActive: true });
      alert("Verification complete! Redirecting...");
      window.location.href = role === "partner" ? "/partner/dashboard" : "/user/dashboard";
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Account Verification</h1>

      <div className="mb-6">
        <h2 className="font-semibold">Email Verification</h2>
        {emailVerified ? (
          <p className="text-green-600">✅ Your email is verified</p>
        ) : (
          <>
            <p className="text-red-600">❌ Not verified</p>
            <button
              onClick={sendVerification}
              className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
            >
              Send Verification Email
            </button>
          </>
        )}
      </div>

      {role === "partner" && (
        <div className="mb-6">
          <h2 className="font-semibold">Phone Verification</h2>
          {phoneVerified ? (
            <p className="text-green-600">✅ Phone verified</p>
          ) : (
            <PhoneVerificationForm onVerified={markPhoneVerified} />
          )}
        </div>
      )}

      <button
        onClick={markActive}
        disabled={!emailVerified || (role === "partner" && !phoneVerified)}
        className="bg-green-600 text-white px-6 py-2 rounded disabled:opacity-50"
      >
        Complete Verification
      </button>
    </div>
  );
}
