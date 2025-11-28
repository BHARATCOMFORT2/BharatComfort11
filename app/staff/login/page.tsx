"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase-client";
import toast from "react-hot-toast";

export default function StaffLoginPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.email || !form.password) {
      return toast.error("Email and password required");
    }

    try {
      setLoading(true);

      // ✅ Firebase Auth Login
      const cred = await signInWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      const uid = cred.user.uid;

      // ✅ Firestore Profile Check
      const snap = await getDoc(doc(db, "users", uid));

      if (!snap.exists()) {
        await auth.signOut();
        return toast.error("Profile not found");
      }

      const profile = snap.data();

      // ❌ Not staff
      if (profile.role !== "staff") {
        await auth.signOut();
        return toast.error("This login is for staff only");
      }

      // ⏳ Pending Approval
      if (profile.status === "pending") {
        await auth.signOut();
        return toast("Your account is pending admin approval", {
          icon: "⏳",
        });
      }

      // ❌ Rejected
      if (profile.status === "rejected") {
        await auth.signOut();
        return toast.error("Your account has been rejected by admin");
      }

      // ✅ Approved Staff → Dashboard
      toast.success("Login successful");
      router.push("/staff/dashboard");
    } catch (err: any) {
      console.error("Staff login error:", err);
      toast.error(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-xl font-semibold mb-1">Staff Login</h1>
        <p className="text-sm text-gray-500 mb-6">
          Sirf approved telecallers hi login kar sakte hain
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white rounded-md py-2 text-sm disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-4 text-center">
          New staff?{" "}
          <span
            className="underline cursor-pointer"
            onClick={() => router.push("/staff/register")}
          >
            Register here
          </span>
        </p>
      </div>
    </div>
  );
}
