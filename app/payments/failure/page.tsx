"use client";

import Link from "next/link";

export default function PaymentFailurePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-6">
      <div className="bg-white p-10 rounded-2xl shadow-lg text-center max-w-md">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Payment Failed ❌</h1>
        <p className="text-gray-700 mb-6">
          Unfortunately, your payment could not be processed. Please try again or use a different
          method.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/payments/checkout"
            className="px-6 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition"
          >
            Try Again
          </Link>
          <Link
            href="/"
            className="px-6 py-2 bg-gray-600 text-white rounded-lg shadow hover:bg-gray-700 transition"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
