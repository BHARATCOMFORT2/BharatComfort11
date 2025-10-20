"use client";

import { useState } from "react";
import { openRazorpayCheckout } from "@/lib/payments-razorpay";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutForm({
  userId = "guest",
  listingId = "demoListing",
  totalAmount = 500,
  email = "test@example.com",
  phone = "9999999999",
}: {
  userId?: string;
  listingId?: string;
  totalAmount?: number;
  email?: string;
  phone?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");

  // ✅ Trigger payment flow
  const handlePayment = async () => {
    try {
      setLoading(true);
      setStatus("processing");

      // Step 1️⃣ — Create Razorpay order
      const createRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalAmount,
          listingId,
          userId,
        }),
      });

      const createData = await createRes.json();
      if (!createData.success) throw new Error(createData.error || "Order creation failed");

      // Step 2️⃣ — Open Razorpay Checkout
      openRazorpayCheckout({
        amount: createData.amount / 100,
        orderId: createData.id,
        name: "BharatComfort Booking",
        email,
        phone,
        onSuccess: async (response: any) => {
          console.log("✅ Razorpay success:", response);

          // Step 3️⃣ — Verify payment on backend
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              listingId,
              totalPrice: totalAmount,
              userId,
            }),
          });

          const verifyData = await verifyRes.json();

          if (verifyData.success) {
            setStatus("success");
            alert("✅ Payment verified and booking confirmed!");
          } else {
            setStatus("error");
            alert("❌ Payment verification failed.");
          }
        },
        onFailure: (err: any) => {
          console.error("❌ Payment failed:", err);
          setStatus("error");
          alert("❌ Payment failed or cancelled.");
        },
      });
    } catch (error: any) {
      console.error("💥 Payment error:", error);
      alert(error.message || "Payment failed");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg w-full max-w-md mx-auto text-center space-y-4">
      <h2 className="text-2xl font-semibold">Complete Your Booking</h2>
      <p className="text-gray-600">Amount payable: ₹{totalAmount}</p>

      <button
        onClick={handlePayment}
        disabled={loading}
        className={`w-full py-3 text-white rounded-lg transition ${
          loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {loading ? "Processing..." : "Pay Now"}
      </button>

      {status === "success" && (
        <p className="text-green-600 font-semibold mt-3">
          ✅ Payment successful! Your booking is confirmed.
        </p>
      )}
      {status === "error" && (
        <p className="text-red-600 font-semibold mt-3">
          ❌ Payment failed. Please try again.
        </p>
      )}
    </div>
  );
}
