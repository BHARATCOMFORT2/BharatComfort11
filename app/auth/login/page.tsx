"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/forms/Input";
import Button from "@/components/forms/Button";
import { signInWithEmailAndPassword, getIdToken } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Eye, EyeOff } from "lucide-react";

const ADMIN_EMAILS = [
  "founder@bharatcomfort.in",
  "shrrajbhar12340@gmail.com",
];

export default function LoginPage() {
  const router = useRouter();
  const [redirectTo, setRedirectTo] = useState("/user/dashboard");
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get("redirect");
      if (redirect) setRedirectTo(redirect);
    }
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1) Firebase sign-in
      const cred = await signInWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      );

      let user = auth.currentUser;
      let tries = 0;

      while (!user && tries < 10) {
        await new Promise((r) => setTimeout(r, 120));
        user = auth.currentUser;
        tries++;
      }

      if (!user) throw new Error("Failed to initialize Firebase user session.");

      // 2) Create secure session cookie
      const idToken = await getIdToken(user, false);
      const sessionRes = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: idToken }),
      });

      if (!sessionRes.ok) {
        throw new Error("Session cookie creation failed.");
      }

      // 3) Admin immediate redirect
      if (ADMIN_EMAILS.includes(user.email || "")) {
        router.push("/admin/dashboard");
        return;
      }

      // 4) Load user profile from Firestore
      const userRef = doc(db, "users", user.uid);
      let snap;

      try {
        snap = await getDoc(userRef);
      } catch (err) {
        console.error("Firestore read failed:", err);
        setError("⚠️ Unable to load profile. Permission denied.");
        await auth.signOut();
        return;
      }

      if (!snap.exists()) {
        setError("⚠️ No profile found.");
        await auth.signOut();
        return;
      }

      const userData = snap.data();
      const role = userData.role || "user";
      const emailVerified = user.emailVerified || userData.emailVerified;
      const phoneVerified = userData.phoneVerified || false;

      // 5) Verification checks
      if (!emailVerified) {
        setError("📧 Please verify your email first.");
        router.push("/auth/verify");
        return;
      }

      if (!phoneVerified) {
        setError("📱 Please verify your phone number first.");
        router.push("/auth/verify");
        return;
      }

      // 6) Sync verified flags
      try {
        if (!userData.emailVerified || !userData.phoneVerified || !userData.verified) {
          await updateDoc(userRef, {
            emailVerified: true,
            phoneVerified: true,
            verified: true,
            updatedAt: new Date(),
          });
        }
      } catch {}

      // ------------------------------
      // ⭐ 7) PARTNER KYC REDIRECT LOGIC
      // ------------------------------
      if (role === "partner") {
        const partnerRef = doc(db, "partners", user.uid);
        let partnerSnap = null;

        try {
          partnerSnap = await getDoc(partnerRef);
        } catch (err) {
          console.error("Partner doc read error:", err);
        }

        let kycStatus = "NOT_STARTED";

        if (partnerSnap?.exists()) {
          const pdata = partnerSnap.data();
          kycStatus = pdata.kycStatus || pdata.kyc?.status || "NOT_STARTED";
          kycStatus = kycStatus.toUpperCase();
        }

        // 🌟 FORCE KYC BEFORE DASHBOARD
        if (kycStatus === "NOT_STARTED" || kycStatus === "NOT_CREATED") {
          router.push("/partner/dashboard/kyc");
          return;
        }

        router.push("/partner/dashboard");
        return;
      }

      // ------------------------------
      // 8) USER DASHBOARD
      // ------------------------------
      if (
        redirectTo &&
        redirectTo.startsWith("/listing/") &&
        redirectTo.includes("/book")
      ) {
        router.push(redirectTo);
        return;
      }

      router.push("/user/dashboard");
    } catch (err) {
      console.error("❌ Login Error:", err);

      let msg = "❌ Login failed. Try again.";

      if (err.code === "auth/invalid-email") msg = "Invalid email.";
      if (err.code === "auth/user-not-found") msg = "User not found.";
      if (err.code === "auth/wrong-password") msg = "Incorrect password.";
      if (err.code === "auth/too-many-requests")
        msg = "Too many attempts. Try again later.";

      if (String(err).includes("permission")) {
        msg = "⚠️ Firestore permissions error.";
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          Login
        </h1>

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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
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

          <Button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>

        <div className="mt-4 text-center text-gray-500 text-sm space-y-1">
          <p>
            Forgot password?{" "}
            <a className="text-blue-600 hover:underline" href="/auth/forgot-password">
              Reset here
            </a>
          </p>
          <p>
            Don’t have an account?{" "}
            <a className="text-blue-600 hover:underline" href="/auth/register">
              Register
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
