"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export default function PartnerWithUsPage() {
  const [loading, setLoading] = useState(false);

  // ✅ SAME LOGIC — PLAN FIXED
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    businessName: "",
    city: "",
    businessType: "Hotel",
    planType: "free-commission", // 🔒 single plan
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

      // ✅ SAME FIRESTORE FLOW
      await addDoc(collection(db, "partnerLeads"), {
        ...form,
        commissionModel: "per-booking",
        commissionRange: "5-10%",
        status: "new",
        source: "partner-with-us-page",
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
        planType: "free-commission",
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
      {/* ===================================================
         HERO
      =================================================== */}
      <section className="py-20 text-center px-6">
        <h1 className="text-4xl md:text-6xl font-bold text-yellow-400">
          Partner With BharatComfort
        </h1>
        <p className="mt-4 text-slate-300 max-w-3xl mx-auto">
          Yahan partner sirf listing nahi, <b>business saathi</b> hota hai.
        </p>
      </section>

      {/* ===================================================
         FREE COMMISSION PLAN
      =================================================== */}
      <section className="py-16 px-6 max-w-4xl mx-auto">
        <div className="border border-yellow-400/40 rounded-3xl p-10 bg-yellow-400/5 text-center">
          <h3 className="text-3xl font-bold text-yellow-400 mb-4">
            FREE PARTNER PLAN
          </h3>

          <p className="text-slate-300 mb-6 text-lg">
            No joining fee • No monthly fee
            <br />
            <span className="text-yellow-300 font-semibold">
              Sirf booking par commission: <b>5% – 10%</b>
            </span>
          </p>

          <ul className="grid md:grid-cols-2 gap-3 text-sm text-slate-200 text-left max-w-3xl mx-auto">
            <li>✔ Listing live on BharatComfort</li>
            <li>✔ Priority Listing</li>
            <li>✔ Google Map Optimization</li>
            <li>✔ Direct Customer Calls & WhatsApp</li>
            <li>✔ Promo Video + Reels</li>
            <li>✔ Festival Promotions</li>
            <li>✔ Review Management</li>
            <li>✔ Fake Review Remove / Flag Support</li>
            <li>✔ Telecaller Follow-ups</li>
            <li>✔ Dedicated Support Executive</li>
            <li>✔ WhatsApp Booking Setup</li>
            <li>✔ Relationship Manager</li>
            <li>✔ No Forced Discounts</li>
            <li>✔ No Sudden Bans</li>
          </ul>
        </div>
      </section>

      {/* ===================================================
         UNIVERSAL PRIVILEGES
      =================================================== */}
      <section className="py-16 px-6 max-w-5xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-yellow-400 mb-6">
          Universal Partner Privileges (Included in Free Plan)
        </h2>

        <ul className="grid md:grid-cols-2 gap-4 text-sm text-slate-200">
          <li>✔ Booking se pehle customer se direct baat</li>
          <li>✔ Direct Call & WhatsApp Access</li>
          <li>✔ Transparent commission system</li>
          <li>✔ Real human support</li>
          <li>✔ No hidden conditions</li>
          <li>✔ No sudden bans</li>
          <li>✔ Real reviews only</li>
          <li>✔ Fake review delete / flag authority</li>
        </ul>
      </section>

      {/* ===================================================
         PARTNER WITH US FORM (BOTTOM)
      =================================================== */}
      <section className="py-20 px-6 max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-yellow-400 mb-4 text-center">
          Partner With Us
        </h2>

        <p className="text-center text-slate-300 mb-8 text-sm">
          Koi joining fee nahi • Sirf booking par 5%–10% commission
          <br />
          Details bharo — hum khud call karke onboarding karenge
        </p>

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
            className="w-full py-3 bg-yellow-400 text-black font-bold rounded-xl text-lg"
          >
            {loading ? "Submitting..." : "Join as Free Partner"}
          </button>
        </form>
      </section>
    </main>
  );
}
