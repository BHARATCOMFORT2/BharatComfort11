"use client";

import { useState, useEffect } from "react";

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Load Razorpay script once
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);
  }, []);

  const startPayment = async () => {
    if (!razorpayLoaded) {
      alert("Payment system not ready yet, please try again.");
      return;
    }

    setLoading(true);

    try {
      // 1. Create order from backend (server-only secrets used there)
      const res = await fetch("/api/payments/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 50000, currency: "INR" }), // ₹500
      });
      const order = await res.json();

      // 2. Setup Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: order.amount,
        currency: order.currency,
        name: "BharatComfort",
        description: "Booking Payment",
        order_id: order.id,
        handler: function (response: any) {
          alert("✅ Payment Success: " + response.razorpay_payment_id);
          // TODO: call backend verify API or rely on webhook
        },
        prefill: {
          name: "Test User",
          email: "test@example.com",
          contact: "9999999999",
        },
        theme: { color: "#0d9488" },
      };

      // @ts-ignore
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("❌ Payment error:", err);
      alert("Payment failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>
      <button
        onClick={startPayment}
        disabled={loading}
        className="px-6 py-2 bg-emerald-600 text-white rounded-lg shadow"
      >
        {loading ? "Processing..." : "Proceed to Pay"}
      </button>
    </div>
  );
}
