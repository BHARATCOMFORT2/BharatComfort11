"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";

export default function PaymentSuccessPage() {
  const [payment, setPayment] = useState<any>(null);

  useEffect(() => {
    // Example: get paymentId from query params
    const urlParams = new URLSearchParams(window.location.search);
    const paymentId = urlParams.get("payment_id");

    if (paymentId) {
      getDoc(doc(db, "payments", paymentId)).then((snap) => {
        if (snap.exists()) setPayment(snap.data());
      });
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-50 p-6">
      <div className="bg-white p-10 rounded-2xl shadow-lg text-center max-w-md">
        <h1 className="text-3xl font-bold text-emerald-600 mb-4">
          Payment Successful 🎉
        </h1>
        {payment ? (
          <>
            <p className="text-gray-700 mb-2">Amount: ₹{payment.amount}</p>
            <p className="text-gray-700 mb-6">Status: {payment.status}</p>
          </>
        ) : (
          <p className="text-gray-700 mb-6">Fetching payment details...</p>
        )}
        <Link
          href="/user/dashboard"
          className="px-6 py-2 bg-emerald-600 text-white rounded-lg shadow hover:bg-emerald-700 transition"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-50 p-6">
      <div className="bg-white p-10 rounded-2xl shadow-lg text-center max-w-md">
        <h1 className="text-3xl font-bold text-emerald-600 mb-4">Payment Successful 🎉</h1>
        <p className="text-gray-700 mb-6">
          Thank you for your payment! Your booking/order has been confirmed.
        </p>
        <Link
          href="/user/dashboard"
          className="px-6 py-2 bg-emerald-600 text-white rounded-lg shadow hover:bg-emerald-700 transition"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
