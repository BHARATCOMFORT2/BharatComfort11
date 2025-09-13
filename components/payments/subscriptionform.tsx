"use client";

import React, { useState } from "react";

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

      // 1. Ask backend to create subscription
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (!data.subscriptionId) throw new Error("Subscription creation failed");

      // 2. Razorpay subscription checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: data.subscriptionId,
        name: "BharatComfort",
        description: `Subscribe to ${plan.toUpperCase()} plan`,
        handler: function (response: any) {
          alert(
            `✅ Subscription successful! Payment ID: ${response.razorpay_payment_id}`
          );
          // TODO: verify subscription on backend
        },
        prefill: {
          name: "Test User",
          email: "test@example.com",
          contact: "9999999999",
        },
        theme: { color: "#0f172a" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
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
