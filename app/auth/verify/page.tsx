// app/auth/verify/page.tsx
"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { sendEmailVerification, onAuthStateChanged } from "firebase/auth";

export default function VerifyPage() {
  const [user, setUser] = useState<any>(null);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleSendVerification = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser, {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify`,
      });
      setEmailSent(true);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded shadow">
        <h1 className="text-xl font-bold">Not logged in</h1>
        <p>Please register or login first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded shadow space-y-4">
      <h1 className="text-2xl font-bold text-center">Verify Your Account</h1>

      {/* ✅ Email Verification */}
      {!user.emailVerified ? (
        <div className="p-4 border rounded bg-yellow-50">
          <p className="mb-2">Your email <b>{user.email}</b> is not verified.</p>
          <button
            onClick={handleSendVerification}
            disabled={emailSent}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {emailSent ? "Verification Sent ✔" : "Send Verification Email"}
          </button>
        </div>
      ) : (
        <div className="p-4 border rounded bg-green-50">
          <p>✅ Your email is verified.</p>
        </div>
      )}

      {/* ✅ Phone Verification (if phone linked) */}
      {user.phoneNumber ? (
        <div className="p-4 border rounded bg-green-50">
          <p>✅ Your phone <b>{user.phoneNumber}</b> is verified.</p>
        </div>
      ) : (
        <div className="p-4 border rounded bg-gray-50">
          <p>You haven’t verified your phone number yet.</p>
          <p className="text-sm text-gray-600">Phone verification happens during login with OTP.</p>
        </div>
      )}
    </div>
  );
}
