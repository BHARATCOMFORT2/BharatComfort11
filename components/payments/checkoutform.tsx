"use client";

import { useState } from "react";
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

  // ✅ Real-time Firestore listener
  const listenToBooking = (id: string) => {
    const ref = doc(db, "bookings", id);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setStatus(snap.data().status || "confirmed");
      }
    });
  };

  const openRazorpayCheckout = ({
    amount,
    orderId,
    name,
    email,
    phone,
    onSuccess,
    onFailure,
  }: {
    amount: number;
    orderId: string;
    name: string;
    email: string;
    phone?: string;
    onSuccess?: (response: any) => void;
    onFailure?: (response: any) => void;
  }) => {
    if (typeof window === "undefined") return;

    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key) {
      console.error("❌ Missing NEXT_PUBLIC_RAZORPAY_KEY_ID in environment.");
      if (onFailure) onFailure({ error: "Key not configured" });
      return;
    }

    const options = {
      key,
      amount: Math.round(amount * 100),
      currency: "INR",
      order_id: orderId,
      name,
      prefill: { email, contact: phone },
      theme: { color: "#2563eb" },
      handler: (response: any) => {
        console.log("✅ Payment Success:", response);
        if (onSuccess) onSuccess(response);
      },
      modal: {
        ondismiss: () => {
          console.warn("⚠️ Payment popup closed");
          if (onFailure) onFailure({ error: "Payment cancelled" });
        },
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const handlePayment = async () => {
    try {
      setLoading(true);

      // ✅ Step 1: Create Razorpay order (via API)
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 500 }), // Example ₹500
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Order creation failed");

      // ✅ Optional: start listening for booking updates
      if (data.bookingId) {
        setBookingId(data.bookingId);
        listenToBooking(data.bookingId);
      }

      // ✅ Step 2: Open Razorpay checkout
      openRazorpayCheckout({
        amount: data.amount / 100,
        orderId: data.id,
        name: "BharatComfort",
        email: "test@example.com",
        phone: "9999999999",
        onSuccess: async (response) => {
          // ✅ Step 3: Verify payment (via API)
          const verify = await fetch("/api/verify", {
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
