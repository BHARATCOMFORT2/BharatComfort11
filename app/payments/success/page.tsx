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
