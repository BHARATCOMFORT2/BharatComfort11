"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { motion } from "framer-motion";

export default function PartnerSignupPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Basic validation
      if (!form.name || !form.email || !form.phone || !form.businessName) {
        setError("Please fill in all required fields.");
        setLoading(false);
        return;
      }

      // Save to Firestore
      await addDoc(collection(db, "partners"), {
        ...form,
        createdAt: serverTimestamp(),
        status: "pending", // pending verification by admin
      });

      setSubmitted(true);
    } catch (err: any) {
      console.error("Error submitting partner signup:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <h1 className="text-3xl font-bold text-yellow-900 mb-4">Thank You!</h1>
        <p className="text-gray-700 text-center">
          Your partner signup request has been received. Our team will verify your details and get back to you shortly.
        </p>
      </div>
    );

  return (
    <motion.div
      className="min-h-screen bg-gray-50 flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-md p-6 w-full max-w-md space-y-4"
      >
        <h1 className="text-3xl font-bold text-yellow-900 text-center mb-4">Partner Signup</h1>

        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

        <input
          type="text"
          name="name"
          placeholder="Full Name *"
          value={form.name}
          onChange={handleChange}
          className="w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email *"
          value={form.email}
          onChange={handleChange}
          className="w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          required
        />
        <input
          type="tel"
          name="phone"
          placeholder="Phone Number *"
          value={form.phone}
          onChange={handleChange}
          className="w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          required
        />
        <input
          type="text"
          name="businessName"
          placeholder="Business Name *"
          value={form.businessName}
          onChange={handleChange}
          className="w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          required
        />
        <textarea
          name="address"
          placeholder="Business Address"
          value={form.address}
          onChange={handleChange}
          className="w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none h-24"
        />

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-xl text-white font-semibold transition ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {loading ? "Submitting..." : "Submit Signup"}
        </button>
      </form>
    </motion.div>
  );
}
