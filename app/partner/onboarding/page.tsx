"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export default function PartnerOnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    businessName: "",
    category: "hotel",
    description: "",
    address: "",
    phone: "",
    website: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("You must be logged in as a partner");

      // Save partner profile
      await setDoc(doc(db, "partners", user.uid), {
        uid: user.uid,
        ...form,
        approved: false, // Superadmin approves later
        createdAt: new Date().toISOString(),
      });

      router.push("/partner/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-lg">
      <h1 className="text-2xl font-bold mb-6 text-center">Partner Onboarding</h1>
      <p className="text-gray-600 text-center mb-8">
        Tell us about your business so we can list it on BharatComfort.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow space-y-4"
      >
        <input
          type="text"
          name="businessName"
          placeholder="Business Name"
          value={form.businessName}
          onChange={handleChange}
          className="w-full p-3 border rounded"
          required
        />

        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          className="w-full p-3 border rounded"
        >
          <option value="hotel">Hotel</option>
          <option value="restaurant">Restaurant</option>
          <option value="travel">Travel Agency</option>
          <option value="other">Other</option>
        </select>

        <textarea
          name="description"
          placeholder="Business Description"
          value={form.description}
          onChange={handleChange}
          className="w-full p-3 border rounded"
          rows={3}
        />

        <input
          type="text"
          name="address"
          placeholder="Business Address"
          value={form.address}
          onChange={handleChange}
          className="w-full p-3 border rounded"
          required
        />

        <input
          type="text"
          name="phone"
          placeholder="Phone Number"
          value={form.phone}
          onChange={handleChange}
          className="w-full p-3 border rounded"
          required
        />

        <input
          type="url"
          name="website"
          placeholder="Website (optional)"
          value={form.website}
          onChange={handleChange}
          className="w-full p-3 border rounded"
        />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700"
        >
          {loading ? "Submitting..." : "Submit for Review"}
        </button>
      </form>
    </div>
  );
}
