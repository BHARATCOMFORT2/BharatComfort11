"use client";

import { motion } from "framer-motion";

export default function FAQsPage() {
  const faqs = [
    {
      q: "What is BHARATCOMFORT11?",
      a: "BHARATCOMFORT11 is an AI-powered travel platform connecting travelers with verified partners across India for roadways, railways, and airways.",
    },
    {
      q: "How do cancellations and refunds work?",
      a: "Each partner defines their own cancellation and refund policy. Refunds approved by partners are verified by the admin team and processed to your original payment method within 5–7 business days.",
    },
    {
      q: "Where can I view a partner’s policy?",
      a: "You can find each partner’s cancellation and refund policy on their listing page or booking summary before payment.",
    },
    {
      q: "Is my payment secure?",
      a: "Yes. We use Razorpay for encrypted payments and Firebase for secure authentication and database management.",
    },
    {
      q: "How are partners verified?",
      a: "All partners undergo strict KYC verification and admin approval before listing on the platform.",
    },
    {
      q: "How can I contact support?",
      a: "You can reach our support team via email at support@bharatcomfort11.com or through the in-app Help Center.",
    },
  ];

  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6 max-w-5xl mx-auto space-y-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center">
        <h1 className="text-4xl font-bold text-yellow-900 mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-gray-700 text-lg max-w-3xl mx-auto">
          Find answers to the most common questions about{" "}
          <strong>BHARATCOMFORT11</strong> and how our platform works.
        </p>
      </div>

      <section className="space-y-6">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
          >
            <h3 className="text-xl font-semibold text-yellow-900 mb-2">
              {faq.q}
            </h3>
            <p className="text-gray-700 leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </section>
    </motion.div>
  );
}
