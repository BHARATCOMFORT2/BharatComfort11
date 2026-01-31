"use client";

import InvestorInterestForm from "@/components/public/InvestorInterestForm";

export default function InvestWithUsPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-14">
      <h1 className="text-3xl font-bold text-center mb-4">
        Invest With BharatComfort
      </h1>

      <p className="text-center text-gray-600 mb-10">
        Join us in building India’s most trusted travel & hospitality platform.
      </p>

      <div className="bg-white shadow rounded-xl p-6">
        <InvestorInterestForm />
      </div>
    </main>
  );
}
