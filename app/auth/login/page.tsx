"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/forms/Input";
import Button from "@/components/forms/Button";
import { signInWithEmailAndPassword, getIdToken } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [redirectTo, setRedirectTo] = useState("/(dashboard)/user");
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /* ----------------------------------------------------
     ✅ Capture redirect query if coming from Book Now
  ---------------------------------------------------- */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get("redirect");
      if (redirect) setRedirectTo(redirect);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  /* ----------------------------------------------------
     🔐 LOGIN HANDLER
  ---------------------------------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1️⃣ Firebase sign-in
      const cred = await signInWithEmailAndPassword(auth, form.email.trim(), form.password);
      const user = cred.user;
      await user.reload();

      // 2️⃣ Firestore profile lookup
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        setError("⚠️ No profile found. Please contact support.");
        await auth.signOut();
        return;
      }

      const userData = snap.data();
      const role = userData.role || "user";
      const emailVerified = user.emailVerified || userData.emailVerified;
      const phoneVerified = userData.phoneVerified || false;

      // 3️⃣ Email Verification Check
      if (!emailVerified) {
        setError("📧 Please verify your email first.");
        router.push("/auth/verify-email");
        return;
      }

      // 4️⃣ Phone Verification Check
      if (!phoneVerified) {
        setError("📱 Please verify your phone number first.");
        router.push("/auth/verify-phone");
        return;
      }

      // 5️⃣ Update Firestore flags if needed
      if (!userData.emailVerified || !userData.phoneVerified || !userData.verified) {
        await updateDoc(userRef, {
          emailVerified: true,
          phoneVerified: true,
          verified: true,
        });
      }

      // 6️⃣ Create session (for middleware verification)
      const token = await getIdToken(user);
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) throw new Error("Session setup failed. Try again.");

      // 7️⃣ Redirect Logic
      if (redirectTo && redirectTo.startsWith("/listing/") && redirectTo.includes("/book")) {
        router.push(redirectTo);
        return;
      }

      switch (role) {
        case "admin":
          router.push("/(dashboard)/admin");
          break;
        case "partner":
          if (userData.status === "pending") {
            alert("⚠️ Your partner account is pending admin approval.");
            router.push("/auth/verify");
          } else {
            router.push("/(dashboard)/partner");
          }
          break;
        default:
          router.push("/(dashboard)/user");
      }
    } catch (err: any) {
      console.error("❌ Login error:", err);
      let msg = "❌ Login failed. Please try again.";
      if (err.code === "auth/invalid-email") msg = "Invalid email address.";
      if (err.code === "auth/user-not-found") msg = "User not found.";
      if (err.code === "auth/wrong-password") msg = "Incorrect password.";
      if (err.code === "auth/too-many-requests") msg = "Too many attempts. Try again later.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------
     🖼️ UI
  ---------------------------------------------------- */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Login</h1>

        {error && (
          <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm text-center">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              className="w-full border rounded-lg p-3 pr-10 focus:ring focus:ring-blue-100"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>

        <div className="mt-4 text-center text-gray-500 text-sm space-y-1">
          <p>
            Forgot your password?{" "}
            <a href="/auth/forgot-password" className="text-blue-600 font-medium hover:underline">
              Reset here
            </a>
          </p>
          <p>
            Don’t have an account?{" "}
            <a href="/auth/register" className="text-blue-600 font-medium hover:underline">
              Register
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
