"use client";

import { useState } from "react";

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);

  const startPayment = async () => {
    setLoading(true);

    try {
      // 1. Create order from backend
      const res = await fetch("/api/payments/razorpay", {
        method: "POST",
        body: JSON.stringify({ amount: 500 }), // Example: ₹500
        headers: { "Content-Type": "application/json" },
      });
      const { order } = await res.json();

      // 2. Load Razorpay script if not loaded
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
          amount: order.amount,
          currency: order.currency,
          name: "BharatComfort",
          description: "Booking Payment",
          order_id: order.id,
          handler: function (response: any) {
            alert("Payment Success ✅: " + response.razorpay_payment_id);
            // TODO: verify signature via backend webhook
          },
          prefill: {
            name: "Test User",
            email: "test@example.com",
            contact: "9999999999",
          },
          theme: {
            color: "#0d9488",
          },
        };

        // @ts-ignore
        const rzp = new window.Razorpay(options);
        rzp.open();
      };
    } catch (err) {
      console.error(err);
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
        {loading ? "Processing..." : "Pay ₹500"}
      </button>
    </div>
  );
}
