"use client";

import { motion } from "framer-motion";

export default function TermsConditionsPage() {
  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6 max-w-5xl mx-auto space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-4xl font-bold text-yellow-900 text-center mb-4">Terms & Conditions</h1>
      <p className="text-gray-700">
        By using BharatComfort, you agree to the following terms and conditions:
      </p>
      <ul className="list-disc list-inside text-gray-700 space-y-1">
        <li>All bookings are subject to partner cancellation policies.</li>
        <li>Users must provide accurate personal information.</li>
        <li>BharatComfort is not liable for third-party property issues.</li>
        <li>Use of the platform constitutes acceptance of all terms.</li>
      </ul>
    </motion.div>
  );
}
