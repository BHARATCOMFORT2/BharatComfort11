"use client";

import { useState } from "react";
import Input from "@/components/forms/Input";
import Button from "@/components/forms/Button";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  getIdToken,
  sendEmailVerification,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Eye, EyeOff } from "lucide-react"; // 👁️ using lucide-react icons

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // 👈 toggle state

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 🔹 Firebase Auth login
      const cred = await signInWithEmailAndPassword(auth, form.email, form.password);
      const user = cred.user;

      // 🔹 Fetch user document
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setError("⚠️ No user profile found in Firestore.");
        return;
      }

      const userData = snap.data();
      const role = userData.role || "user";
      const phoneVerified = userData.phoneVerified || false;

      // 🔹 Check email verification
      if (!user.emailVerified) {
        await sendEmailVerification(user, {
          url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify`,
        });
        alert("📧 Please verify your email first. A verification link has been sent!");
        router.push("/auth/verify");
        return;
      }

      // 🔹 Check phone verification
      if (!phoneVerified) {
        alert("📱 Please verify your phone number before continuing.");
        router.push("/auth/verify");
        return;
      }

      // 🔹 Mark email as verified in Firestore
      await updateDoc(ref, { emailVerified: true });

      // 🔹 Create a secure session
      const token = await getIdToken(user);
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      // 🔹 Role-based redirection
      if (role === "admin") {
        alert("✅ Welcome Admin!");
        router.push("/admin/dashboard");
      } else if (role === "partner") {
        if (userData.status === "pending") {
          alert("⚠️ Your partner account is pending approval.");
          router.push("/auth/verify");
          return;
        }
        alert("✅ Welcome Partner!");
        router.push("/partner/dashboard");
      } else {
        alert("✅ Welcome User!");
        router.push("/user/dashboard");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError("❌ " + (err.message || "Login failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Login</h1>

        {error && (
          <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 📧 Email Input */}
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={handleChange}
          />

          {/* 🔒 Password Input with Eye Icon */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              className="w-full border rounded-lg p-3 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* 🚀 Submit Button */}
          <Button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>

        <div className="mt-4 text-center text-gray-500 space-y-1">
          <p>
            Forgot your password?{" "}
            <a
              href="/auth/forgot-password"
              className="text-blue-600 font-medium hover:underline"
            >
              Reset here
            </a>
          </p>
          <p>
            Don’t have an account?{" "}
            <a
              href="/auth/register"
              className="text-blue-600 font-medium hover:underline"
            >
              Register
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
