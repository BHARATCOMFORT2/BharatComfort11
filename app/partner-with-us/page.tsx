"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export default function PartnerWithUsPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    businessName: "",
    city: "",
    businessType: "Hotel",
    planType: "free",
    message: "",
  });

  function handleChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: any) {
    e.preventDefault();

    if (!form.name || !form.mobile || !form.businessName || !form.city) {
      alert("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);

      // ✅ ✅ ✅ FIXED COLLECTION NAME (RULES COMPATIBLE)
      await addDoc(collection(db, "partnerLeads"), {
        ...form,
        status: "new", // ✅ admin will confirm later
        source: "partner-page",
        createdAt: serverTimestamp(),
      });

      alert(
        "✅ Your details have been submitted successfully. Our team will contact you shortly."
      );

      setForm({
        name: "",
        mobile: "",
        businessName: "",
        city: "",
        businessType: "Hotel",
        planType: "free",
        message: "",
      });
    } catch (err) {
      console.error("Partner Lead Error:", err);
      alert("❌ Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-[#0b1220] text-white min-h-screen">
      {/* HERO */}
      <section className="py-20 text-center px-6">
        <h1 className="text-4xl md:text-6xl font-bold text-yellow-400">
          Partner With BharatComfort
        </h1>
        <p className="mt-4 text-slate-300 max-w-3xl mx-auto">
          Yahan partner sirf listing nahi, <b>business saathi</b> hota hai.
        </p>
      </section>

      {/* PRICING */}
      <section className="py-16 px-6 grid md:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {/* FREE */}
        <div className="border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-2">FREE LISTING</h3>
          <p className="text-sm text-slate-300 mb-4">8–10% Commission</p>
          <ul className="text-sm space-y-2 text-slate-200">
            <li>✔ Basic profile live</li>
            <li>✔ Direct customer calls</li>
            <li>✔ Manual booking handling</li>
            <li>✔ No monthly fee</li>
          </ul>
        </div>

        {/* SILVER */}
        <div className="border border-yellow-400/30 rounded-2xl p-6 bg-yellow-400/5">
          <h3 className="text-xl font-bold text-yellow-300 mb-2">
            SILVER – ₹999/mo
          </h3>
          <ul className="text-sm space-y-2">
            <li>✔ Zero Commission</li>
            <li>✔ Google Map Optimization</li>
            <li>✔ Priority Listing</li>
            <li>✔ 10 Social Posts / Month</li>
            <li>✔ Support Executive (Shared)</li>
            <li>✔ Social Pages Enhancement (Basic)</li>
          </ul>
        </div>

        {/* GOLD */}
        <div className="border border-purple-400/40 rounded-2xl p-6 bg-purple-400/5">
          <h3 className="text-xl font-bold text-purple-300 mb-2">
            GOLD – ₹2,499/mo
          </h3>
          <ul className="text-sm space-y-2">
            <li>✔ Everything in Silver</li>
            <li>✔ Promo Video + 4 Reels</li>
            <li>✔ Festival Promotions</li>
            <li>✔ Review Management</li>
            <li>✔ Telecaller Follow-up</li>
            <li>✔ Dedicated Support Executive</li>
            <li>✔ Social Pages Enhancement (Advanced)</li>
          </ul>
        </div>

        {/* LIFETIME */}
        <div className="border border-yellow-500 rounded-2xl p-6 bg-yellow-500/10">
          <h3 className="text-xl font-bold text-yellow-400 mb-2">
            LIFETIME – ₹4,999 One-Time
          </h3>
          <ul className="text-sm space-y-2">
            <li>✔ Zero Commission Forever</li>
            <li>✔ Permanent Priority Listing</li>
            <li>✔ 1 Promo Video + 5 Posts</li>
            <li>✔ WhatsApp Booking Setup</li>
            <li>✔ Relationship Manager</li>
            <li>✔ Social Pages Enhancement (Premium)</li>
          </ul>
        </div>
      </section>

      {/* UNIVERSAL PRIVILEGES */}
      <section className="py-16 px-6 max-w-5xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-yellow-400 mb-6">
          Universal Partner Privileges (Free + Paid Same)
        </h2>
        <ul className="grid md:grid-cols-2 gap-4 text-sm text-slate-200">
          <li>✔ Booking se pehle customer se direct baat</li>
          <li>✔ Direct Call & WhatsApp Access</li>
          <li>✔ No forceful discount / price control</li>
          <li>✔ Real human support</li>
          <li>✔ No sudden bans</li>
          <li>✔ Transparent records</li>
          <li>✔ Real reviews only</li>
          <li>✔ Fake review delete / flag authority</li>
        </ul>
      </section>

      {/* PARTNER FORM */}
      <section className="py-20 px-6 max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-yellow-400 mb-6 text-center">
          Become a Partner
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Your Name *"
            className="w-full p-3 rounded bg-black/40 border"
          />
          <input
            name="mobile"
            value={form.mobile}
            onChange={handleChange}
            placeholder="Mobile Number *"
            className="w-full p-3 rounded bg-black/40 border"
          />
          <input
            name="businessName"
            value={form.businessName}
            onChange={handleChange}
            placeholder="Business Name *"
            className="w-full p-3 rounded bg-black/40 border"
          />
          <input
            name="city"
            value={form.city}
            onChange={handleChange}
            placeholder="City *"
            className="w-full p-3 rounded bg-black/40 border"
          />

          <select
            name="businessType"
            value={form.businessType}
            onChange={handleChange}
            className="w-full p-3 rounded bg-black/40 border"
          >
            <option>Hotel</option>
            <option>Restaurant</option>
            <option>Homestay</option>
            <option>Other</option>
          </select>

          <select
            name="planType"
            value={form.planType}
            onChange={handleChange}
            className="w-full p-3 rounded bg-black/40 border"
          >
            <option value="free">Free</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="lifetime">Lifetime</option>
          </select>

          <textarea
            name="message"
            value={form.message}
            onChange={handleChange}
            placeholder="Optional Message"
            className="w-full p-3 rounded bg-black/40 border"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-yellow-400 text-black font-bold rounded-xl"
          >
            {loading ? "Submitting..." : "Submit as Confirmed Partner"}
          </button>
        </form>
      </section>
    </main>
  );
}
