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
      // 1️⃣ Firebase login
      await signInWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      );

      let user = auth.currentUser;
      if (!user) throw new Error("Auth initialization failed.");

      // 2️⃣ Create secure session cookie
      const idToken = await getIdToken(user, false);

      const sessionRes = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: idToken }),
      });

      if (!sessionRes.ok) throw new Error("Session cookie creation failed.");

      // 3️⃣ Admin direct access
      if (ADMIN_EMAILS.includes(user.email || "")) {
        router.push("/admin/dashboard");
        return;
      }

      // 4️⃣ Load user profile document
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        setError("⚠️ No profile found.");
        await auth.signOut();
        return;
      }

      const data = snap.data();
      const role = data.role || "user";

      // 5️⃣ Email + phone verification checks
      if (!user.emailVerified || !data.emailVerified) {
        router.push("/auth/verify");
        return;
      }

      if (!data.phoneVerified) {
        router.push("/auth/verify");
        return;
      }

      // Sync verification flags
      try {
        await updateDoc(userRef, {
          emailVerified: true,
          phoneVerified: true,
          verified: true,
          updatedAt: new Date(),
        });
      } catch {}

      // ======================================================
      // ⭐ PARTNER LOGIN LOGIC + FULL KYC CONTROL
      // ======================================================
      if (role === "partner") {
        const partnerRef = doc(db, "partners", user.uid);
        let pSnap = null;

        try {
          pSnap = await getDoc(partnerRef);
        } catch (err) {
          console.error("Partner read error:", err);
        }

        let kycStatus = "NOT_STARTED";

        if (pSnap?.exists()) {
          const pdata = pSnap.data();
          kycStatus = (
            pdata.kycStatus ||
            pdata.kyc?.status ||
            "NOT_STARTED"
          ).toUpperCase();
        }

        // 🚧 BLOCK DASHBOARD UNTIL KYC IS DONE
        if (kycStatus === "NOT_STARTED" || kycStatus === "NOT_CREATED") {
          router.push("/partner/dashboard/kyc");
          return;
        }

        if (kycStatus === "UNDER_REVIEW") {
          router.push("/partner/dashboard/kyc/pending");
          return;
        }

        if (kycStatus === "REJECTED") {
          router.push("/partner/dashboard/kyc?resubmit=1");
          return;
        }

        if (kycStatus === "APPROVED") {
          router.push("/partner/dashboard");
          return;
        }

        // fallback safety
        router.push("/partner/dashboard/kyc");
        return;
      }

      // ======================================================
      // ⭐ NORMAL USER LOGIN LOGIC
      // ======================================================
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
      console.error("❌ Login error:", err);

      let msg = "❌ Login failed.";
      if (err.code === "auth/user-not-found") msg = "User not found.";
      if (err.code === "auth/wrong-password") msg = "Wrong password.";
      if (err.code === "auth/invalid-email") msg = "Invalid email.";

      if (String(err).includes("permission"))
        msg = "⚠️ Firestore permission error.";

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
