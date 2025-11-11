"use client";

import { motion } from "framer-motion";

export default function PrivacyPolicyPage() {
  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6 max-w-5xl mx-auto space-y-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center">
        <h1 className="text-4xl font-bold text-yellow-900 mb-4">
          Privacy Policy
        </h1>
        <p className="text-gray-700 text-lg max-w-3xl mx-auto">
          At <strong>BHARATCOMFORT11</strong>, we value your privacy and are
          committed to protecting your personal information. This policy
          explains how we collect, use, and safeguard your data when you use our
          website, mobile app, or any of our services.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-yellow-900">
          Information We Collect
        </h2>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          <li>Personal details: name, email, and phone number</li>
          <li>Booking, travel, and payment details</li>
          <li>Partner interaction and chat data</li>
          <li>Device and browser information for analytics</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-yellow-900">
          How We Use Your Data
        </h2>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          <li>To process bookings and manage secure payments</li>
          <li>To enhance travel recommendations via AI</li>
          <li>To communicate confirmations, updates, and offers</li>
          <li>To prevent fraud and ensure account security</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-yellow-900">
          Data Sharing
        </h2>
        <p className="text-gray-700 leading-relaxed">
          We do not sell or rent user data. Information is shared only with:
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          <li>Verified partners for booking execution</li>
          <li>Razorpay for secure payment processing</li>
          <li>Firebase and Google Cloud for authentication and storage</li>
          <li>Law enforcement, if required by Indian law</li>
        </ul>
        <p className="text-gray-700 mt-2">
          In refund or cancellation cases, booking details are shared with
          partners to process them as per their individual policies.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-yellow-900">Your Rights</h2>
        <p className="text-gray-700 leading-relaxed">
          You may access, correct, or delete your personal data anytime by
          contacting us at{" "}
          <strong className="text-indigo-700">support@bharatcomfort11.com</strong>.
          You can also opt out of promotional emails at any time.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-yellow-900">
          Policy Updates
        </h2>
        <p className="text-gray-700 leading-relaxed">
          We may update this Privacy Policy periodically. All updates will be
          posted on this page with a revised “Last Updated” date.
        </p>
      </section>
    </motion.div>
  );
}
