"use client";

import { useState } from "react";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Subscribed with ${email}`);
    setEmail("");
  };

  return (
    <section className="py-16 bg-gradient-to-r from-blue-950 via-indigo-900 to-blue-950">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-bold text-yellow-400 mb-4">
          Stay Updated
        </h2>
        <p className="text-gray-300 mb-8">
          Get the latest offers, travel guides, and premium deals directly in your inbox.
        </p>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="px-4 py-3 rounded-xl w-full sm:w-96 border border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-yellow-400 text-blue-950 font-semibold rounded-xl shadow-lg hover:bg-yellow-300 transition"
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
}
