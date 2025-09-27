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
