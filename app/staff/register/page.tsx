"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase-client";
import toast from "react-hot-toast";

export default function StaffRegisterPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.phone || !form.password) {
      return toast.error("All fields are required");
    }

    try {
      setLoading(true);

      // ✅ Firebase Auth user create
      const cred = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      const uid = cred.user.uid;

      // ✅ Firestore profile create
      await setDoc(doc(db, "users", uid), {
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: "staff",
        status: "pending", // ✅ admin approval required
        createdAt: serverTimestamp(),
      });

      toast.success("Registration successful! Approval pending.");

      router.push("/staff/login");
    } catch (err: any) {
      console.error("Staff register error:", err);
      toast.error(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-xl font-semibold mb-1">
          Staff / Telecaller Registration
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Admin approval ke baad hi login milega
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />

          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />

          <input
            name="phone"
            placeholder="Phone Number"
            value={form.phone}
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
            {loading ? "Registering..." : "Register as Staff"}
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Already registered?{" "}
          <span
            className="underline cursor-pointer"
            onClick={() => router.push("/staff/login")}
          >
            Login here
          </span>
        </p>
      </div>
    </div>
  );
}
