"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { getDocs, collection, query, where } from "firebase/firestore";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);

    try {
      // 🔍 Check if user exists and is verified
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError("❌ No account found with this email.");
        return;
      }

      const userData = snap.docs[0].data();

      // 🔒 Require verified email
      if (!userData.emailVerified) {
        setError(
          "⚠️ Your email is not verified. Please verify your account before resetting your password."
        );
        return;
      }

      // ✉️ Send reset email
      await sendPasswordResetEmail(auth, email, {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/login`,
      });

      setMessage("✅ Password reset link sent! Check your inbox.");
    } catch (err: any) {
      console.error("Reset error:", err);
      setError("❌ Failed to send reset email. Please check your email address.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Forgot Password
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow space-y-4"
      >
        <input
          type="email"
          name="email"
          placeholder="Enter your verified email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded"
          required
        />

        {message && <p className="text-green-600 text-sm">{message}</p>}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700"
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
  );
}
