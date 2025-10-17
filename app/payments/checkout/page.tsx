"use client";

import { useState } from "react";
import { openRazorpayCheckout } from "@/lib/payments-razorpay"; // ✅ unified Razorpay helper

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);

  const startPayment = async () => {
    setLoading(true);

    try {
      // ✅ Step 1: Create Razorpay order via backend
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 500 }), // Example: ₹500
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to create order");

      // ✅ Step 2: Open Razorpay Checkout using helper
      openRazorpayCheckout({
        amount: data.amount,
        orderId: data.id,
        name: "BHARATCOMFORT11",
        email: "demo@bharatcomfort.com", // Replace with real user
        phone: "9999999999",
        onSuccess: async (response: any) => {
          // ✅ Step 3: Verify payment after success
          const verify = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: 500,
            }),
          });

          const result = await verify.json();
          if (result.success) {
            alert("✅ Payment successful and verified!");
          } else {
            alert("❌ Payment verification failed");
          }
        },
        onFailure: () => alert("❌ Payment cancelled or failed"),
      });
    } catch (err: any) {
      console.error(err);
      alert("❌ Payment error: " + err.message);
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
