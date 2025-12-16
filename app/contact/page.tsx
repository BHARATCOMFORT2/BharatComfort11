"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Mail, Phone, MapPin, Send } from "lucide-react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "contactMessages"), {
        ...form,
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      console.error("Error saving message:", err);
      alert("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
              <span>support@bharatcomfort.online, bharatcomfort99@gmail.com</span>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="text-yellow-600" />
              <span>+91 9277168528</span>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="text-yellow-600" />
              <span>Ghazipur Uttar Pradesh, India</span>
            </div>
          </div>

          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              type="text"
              placeholder="Your Name"
              className="border rounded-lg p-3 focus:ring-2 focus:ring-yellow-400"
            />
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              type="email"
              placeholder="Your Email"
              className="border rounded-lg p-3 focus:ring-2 focus:ring-yellow-400"
            />
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="Your Message"
              className="border rounded-lg p-3 h-28 focus:ring-2 focus:ring-yellow-400"
            ></textarea>
            <button
              type="submit"
              disabled={loading}
              className="bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 transition flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>Sending...</span>
              ) : (
                <>
                  <Send size={18} /> <span>Send Message</span>
                </>
              )}
            </button>
            {success && (
              <p className="text-green-600 text-sm text-center">
                ✅ Message sent successfully!
              </p>
            )}
          </form>
        </div>
      </div>
    </motion.div>
  );
}
