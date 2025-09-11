"use client";

import { useRouter } from "next/navigation";

export default function PaymentCancelPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-12 text-center">
      <h1 className="text-2xl font-bold text-red-600 mb-4">
        Payment Cancelled ❌
      </h1>
      <p className="mb-6">
        Your payment was not completed. Don’t worry — you can try again
        anytime.
      </p>

      <div className="flex justify-center gap-4">
        <button
          onClick={() => router.push("/listings")}
          className="bg-gray-600 text-white px-6 py-3 rounded-lg shadow hover:bg-gray-700"
        >
          Back to Listings
        </button>

        <button
          onClick={() => router.push("/payments/checkout")}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700"
        >
          Retry Payment
        </button>
      </div>
    </div>
  );
}
