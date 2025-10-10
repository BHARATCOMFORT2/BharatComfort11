"use client";

import { motion } from "framer-motion";
import { Mail, Phone, MapPin } from "lucide-react";

export default function ContactPage() {
  return (
    <motion.div
      className="min-h-screen bg-gradient-to-b from-yellow-50 to-white flex flex-col items-center justify-center px-6 py-16"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="max-w-3xl w-full bg-white shadow-xl rounded-2xl p-8">
        <h1 className="text-4xl font-bold text-center text-yellow-700 mb-4">
          Contact Us
        </h1>
        <p className="text-center text-gray-600 mb-8">
          We'd love to hear from you! Fill out the form or reach us directly.
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Info */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-3">
              <Mail className="text-yellow-600" />
              <span>support@bharatcomfort.com</span>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="text-yellow-600" />
              <span>+91 98765 43210</span>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="text-yellow-600" />
              <span>Mumbai, India</span>
            </div>
          </div>

          {/* Contact Form */}
          <form className="flex flex-col space-y-4">
            <input
              type="text"
              placeholder="Your Name"
              className="border rounded-lg p-3 focus:ring-2 focus:ring-yellow-400"
            />
            <input
              type="email"
              placeholder="Your Email"
              className="border rounded-lg p-3 focus:ring-2 focus:ring-yellow-400"
            />
            <textarea
              placeholder="Your Message"
              className="border rounded-lg p-3 h-28 focus:ring-2 focus:ring-yellow-400"
            ></textarea>
            <button
              type="submit"
              className="bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 transition"
            >
              Send Message
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
