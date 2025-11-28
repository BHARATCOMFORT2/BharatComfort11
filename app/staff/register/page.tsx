"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function StaffRegisterPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    city: "",
    experience: "",
    languages: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { name, email, phone, password } = form;

    if (!name || !email || !phone || !password) {
      return toast.error("All required fields must be filled");
    }

    try {
      setLoading(true);

      const res = await fetch("/api/staff/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          city: form.city || null,
          experience: form.experience || null,
          languages: form.languages
            ? form.languages.split(",").map((l) => l.trim())
            : [],
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Registration failed");
      }

      toast.success(
        "Registration successful! Admin approval pending."
      );

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
            placeholder="Full Name *"
            value={form.name}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />

          <input
            name="email"
            type="email"
            placeholder="Email *"
            value={form.email}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />

          <input
            name="phone"
            placeholder="Phone Number *"
            value={form.phone}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />

          <input
            name="password"
            type="password"
            placeholder="Password *"
            value={form.password}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />

          <input
            name="city"
            placeholder="City (optional)"
            value={form.city}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />

          <input
            name="experience"
            placeholder="Experience (optional)"
            value={form.experience}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />

          <input
            name="languages"
            placeholder="Languages (comma separated, optional)"
            value={form.languages}
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
