"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    // Here you can add API call to send message
    console.log(form);
    setSubmitted(true);
  };

  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6 max-w-3xl mx-auto space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-4xl font-bold text-yellow-900 mb-4 text-center">Contact Us</h1>
      {submitted ? (
        <p className="text-green-600 text-center font-semibold">Thank you! We will get back to you soon.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-2xl shadow-md">
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Your Name"
            required
            className="w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Your Email"
            required
            className="w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
          <textarea
            name="message"
            value={form.message}
            onChange={handleChange}
            placeholder="Your Message"
            required
            className="w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none h-32"
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition w-full"
          >
            Send Message
          </button>
        </form>
      )}
    </motion.div>
  );
}
