"use client";

import { useState } from "react";
import {
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { getDocs, collection, query, where } from "firebase/firestore";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* -------------------------------------------------------
     🔐 Handle Password Reset
  ------------------------------------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) throw new Error("Please enter your email address.");

      // 🔍 Check Firestore user exists
      const q = query(collection(db, "users"), where("email", "==", trimmedEmail));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError("❌ No account found with this email address.");
        return;
      }

      const userData = snap.docs[0].data();

      // 🧩 Require verified email
      if (!userData.emailVerified) {
        setError("⚠️ Your email is not verified yet. Please verify your account first.");
        return;
      }

      // 🧩 Double-check via Firebase Auth
      const methods = await fetchSignInMethodsForEmail(auth, trimmedEmail);
      if (methods.length === 0) {
        setError("❌ No valid sign-in method found for this email.");
        return;
      }

      // ✉️ Send reset email
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      await sendPasswordResetEmail(auth, trimmedEmail, {
        url: `${appUrl}/auth/login`,
      });

      setMessage("✅ Password reset link sent! Check your inbox.");
      setEmail("");
    } catch (err: any) {
      console.error("❌ Password reset error:", err);
      let msg = "Failed to send reset email.";
      if (err.code === "auth/invalid-email") msg = "Invalid email address.";
      if (err.code === "auth/user-not-found") msg = "No user found with this email.";
      if (err.code === "auth/too-many-requests")
        msg = "Too many attempts. Please try again later.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------------------
     🖼️ UI
  ------------------------------------------------------- */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Forgot Password
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Enter your verified email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border rounded focus:ring focus:ring-blue-100"
            required
          />

          {message && (
            <p className="text-green-600 text-sm bg-green-50 p-2 rounded text-center">
              {message}
            </p>
          )}
          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-2 rounded text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white p-3 rounded transition ${
              loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="text-center text-sm mt-4 text-gray-600">
          Remember your password?{" "}
          <a href="/auth/login" className="text-blue-600 hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
