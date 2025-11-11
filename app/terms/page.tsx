"use client";

import { motion } from "framer-motion";

export default function TermsPage() {
  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6 max-w-5xl mx-auto space-y-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center">
        <h1 className="text-4xl font-bold text-yellow-900 mb-4">
          Terms & Conditions
        </h1>
        <p className="text-gray-700 text-lg max-w-3xl mx-auto">
          These Terms & Conditions govern your use of{" "}
          <strong>BHARATCOMFORT11</strong>. By accessing our platform, you agree
          to these terms. Please read them carefully before using our services.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-yellow-900">
          Use of Platform
        </h2>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          <li>You must be at least 18 years old to register or transact.</li>
          <li>
            You agree not to misuse, hack, or attempt unauthorized access to the
            platform.
          </li>
          <li>
            BHARATCOMFORT11 reserves the right to suspend accounts violating
            policies.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-yellow-900">
          Bookings & Payments
        </h2>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          <li>All bookings are subject to partner availability and approval.</li>
          <li>Payments are processed securely through Razorpay.</li>
          <li>BHARATCOMFORT11 does not store card details.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-yellow-900">
          Cancellations & Refunds
        </h2>
        <p className="text-gray-700 leading-relaxed">
          All cancellations and refunds are governed by the{" "}
          <strong>respective partner’s policy</strong>. BHARATCOMFORT11 acts as
          a booking facilitator and does not control refund timelines or terms.
          Travelers are advised to review partner-specific refund policies
          before booking.
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
          <li>
            Refunds approved by partners are verified by the admin team and
            processed within 5–7 business days.
          </li>
          <li>
            In case of disputes, BHARATCOMFORT11 mediates fairly between users
            and partners under SLA timelines.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-yellow-900">
          Partner Obligations
        </h2>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          <li>Partners must provide accurate listings and refund terms.</li>
          <li>Fraudulent activity may result in permanent deactivation.</li>
          <li>
            Partners are responsible for honoring refund commitments stated in
            their policy.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-yellow-900">
          Liability Disclaimer
        </h2>
        <p className="text-gray-700 leading-relaxed">
          BHARATCOMFORT11 acts as a technology intermediary connecting travelers
          and partners. We are not responsible for partner negligence, delays,
          or force majeure events but ensure all partners are verified and
          disputes are resolved transparently.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-yellow-900">
          Governing Law
        </h2>
        <p className="text-gray-700 leading-relaxed">
          These Terms are governed by the laws of India, and any disputes shall
          be subject to the jurisdiction of Mumbai, Maharashtra.
        </p>
      </section>
    </motion.div>
  );
}
