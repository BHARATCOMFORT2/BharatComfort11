"use client";

import React, { useState } from "react";
import { openRazorpayCheckout } from "@/lib/payments-razorpay"; // ✅ unified Razorpay import

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function SubscriptionForm() {
  const [loading, setLoading] = useState(false);

  const startSubscription = async (plan: "premium" | "enterprise") => {
    try {
      setLoading(true);

      // ✅ Step 1: Create subscription via unified API
      const res = await fetch("/api/payments/upgrade-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (!data.success || !data.razorpaySubscriptionId)
        throw new Error(data.error || "Subscription creation failed");

      // ✅ Step 2: Use unified Razorpay helper
      openRazorpayCheckout({
        amount: data.amount ?? 0,
        orderId: data.razorpaySubscriptionId,
        name: "BharatComfort",
        email: "test@example.com", // replace with real user email later
        phone: "9999999999",
        onSuccess: (response: any) => {
          alert(`✅ Subscription successful! Payment ID: ${response.razorpay_payment_id}`);
        },
        onFailure: () => {
          alert("❌ Subscription cancelled or failed");
        },
      });
    } catch (err: any) {
      alert("❌ Subscription failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Choose a Subscription Plan</h2>

      <div className="space-y-3">
        <button
          onClick={() => startSubscription("premium")}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg"
        >
          {loading ? "Processing..." : "Subscribe to Premium (₹999/month)"}
        </button>

        <button
          onClick={() => startSubscription("enterprise")}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg"
        >
          {loading ? "Processing..." : "Subscribe to Enterprise (₹2499/month)"}
        </button>
      </div>
    </div>
  );
}
