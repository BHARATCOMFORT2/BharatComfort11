"use client";

import { useState } from "react";
import { openRazorpayCheckout } from "@/lib/payments-razorpay"; // ✅ unified Razorpay helper
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutForm() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("pending");
  const [bookingId, setBookingId] = useState<string | null>(null);

  // ✅ Real-time booking listener (after order created)
  const listenToBooking = (id: string) => {
    const ref = doc(db, "bookings", id);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setStatus(snap.data().status || "confirmed");
      }
    });
  };

  const handlePayment = async () => {
    try {
      setLoading(true);

      // ✅ Step 1: Create Razorpay order from backend
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 500 }), // Example ₹500
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Order creation failed");

      // ✅ Optional: start listening for booking confirmation in Firestore
      if (data.bookingId) {
        setBookingId(data.bookingId);
        listenToBooking(data.bookingId);
      }

      // ✅ Step 2: Open Razorpay Checkout
      openRazorpayCheckout({
        amount: data.amount,
        orderId: data.id,
        name: "BharatComfort",
        email: "test@example.com", // Replace with actual user later
        phone: "9999999999",
        onSuccess: async (response: any) => {
          // ✅ Step 3: Verify payment with backend
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
            alert("✅ Payment verified successfully!");
          } else {
            alert("❌ Payment verification failed.");
          }
        },
        onFailure: () => alert("❌ Payment cancelled or failed."),
      });
    } catch (err: any) {
      console.error(err);
      alert("❌ Payment failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-bold mb-2">Complete Your Booking</h2>

      <p className="text-gray-600 text-sm">
        Pay securely with Razorpay. This is a demo ₹500 test payment.
      </p>

      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg disabled:opacity-50"
      >
        {loading ? "Processing..." : "Pay ₹500"}
      </button>

      {bookingId && (
        <p className="text-sm text-gray-700 mt-3">
          Booking ID: <span className="font-mono">{bookingId}</span>
          <br />
          Status:{" "}
          <span
            className={`font-semibold ${
              status === "confirmed" ? "text-green-600" : "text-yellow-600"
            }`}
          >
            {status}
          </span>
        </p>
      )}
    </div>
  );
}
