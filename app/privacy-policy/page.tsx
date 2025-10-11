"use client";

import { motion } from "framer-motion";

export default function PrivacyPolicyPage() {
  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6 max-w-5xl mx-auto space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-4xl font-bold text-yellow-900 text-center mb-4">Privacy Policy</h1>
      <p className="text-gray-700">
        BharatComfort respects your privacy. We collect personal information solely to improve your experience and provide secure bookings.
      </p>
      <ul className="list-disc list-inside text-gray-700 space-y-1">
        <li>We never share your personal data with third parties without consent.</li>
        <li>Payment information is encrypted and securely processed.</li>
        <li>You can request data deletion at any time by contacting us.</li>
      </ul>
    </motion.div>
  );
}
