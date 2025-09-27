"use client";

import { useState, useEffect } from "react";

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Dynamically load Razorpay script
  useEffect(() => {
    if (document.getElementById("razorpay-script")) {
      setRazorpayLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);
  }, []);

  const startPayment = async () => {
    if (!razorpayLoaded) {
      alert("Razorpay script not loaded yet");
      return;
    }

    setLoading(true);

    try {
      // 1. Create order from backend
      const res = await fetch("/api/payments/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 500 }), // Example: ₹500
      });
      const data = await res.json();

      if (!data.order) throw new Error("Failed to create order");

      // 2. Setup Razorpay payment options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "BHARATCOMFORT11",
        description: "Booking Payment",
        order_id: data.order.id,
        handler: function (response: any) {
          alert(`✅ Payment successful: ${response.razorpay_payment_id}`);
        },
        prefill: {
          email: "",
          contact: "",
        },
        theme: { color: "#1D4ED8" }, // Tailwind blue-700
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert("❌ Payment failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg text-center">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          Complete Your Payment
        </h1>
        <p className="text-gray-600 mb-6">Pay securely using Razorpay</p>

        <button
          onClick={startPayment}
          disabled={loading}
          className="w-full py-3 bg-blue-700 text-white rounded-xl font-medium hover:bg-blue-800 transition"
        >
          {loading ? "Processing..." : "Pay ₹500"}
        </button>

        <p className="mt-6 text-gray-500 text-sm">
          By proceeding, you agree to our{" "}
          <a href="/terms" className="text-blue-700 underline">
            Terms & Conditions
          </a>
        </p>
      </div>
    </div>
  );
}
