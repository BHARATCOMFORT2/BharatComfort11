"use client";

import { useState } from "react";
import Input from "@/components/forms/Input";
import Button from "@/components/forms/Button";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Sign in with Firebase Auth
      const cred = await signInWithEmailAndPassword(auth, form.email, form.password);
      const user = cred.user;

      // Fetch Firestore user document
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setError("⚠️ No user profile found in Firestore.");
        return;
      }

      const role = snap.data().role;

      // Redirect based on role
      if (role === "admin") {
        alert("✅ Welcome Admin!");
        router.push("/admin/dashboard");
      } else if (role === "partner") {
        alert("✅ Welcome Partner!");
        router.push("/partner/dashboard");
      } else {
        alert("✅ Welcome User!");
        router.push("/user/dashboard");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Login</h1>

        {error && (
          <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col">
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={handleChange}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={form.password}
            onChange={handleChange}
          />

          <Button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>

        <p className="mt-4 text-center text-gray-500">
          Forgot your password?{" "}
          <a
            href="/auth/forgot-password"
            className="text-primary font-medium hover:underline"
          >
            Reset here
          </a>
        </p>

        <p className="mt-2 text-center text-gray-500">
          Don't have an account?{" "}
          <a
            href="/auth/register"
            className="text-primary font-medium hover:underline"
          >
            Register
          </a>
        </p>
      </div>
    </div>
  );
}
