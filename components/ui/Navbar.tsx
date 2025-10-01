"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#0a0f29]/90 backdrop-blur-md shadow-md"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between py-4 px-6">
        {/* Left: Logo */}
        <div className="flex-shrink-0">
          <Link href="/" className="text-2xl font-bold text-yellow-400">
            BharatComfort
          </Link>
        </div>

        {/* Center: Nav Links (Desktop Only) */}
        <div className="hidden md:flex flex-1 justify-center gap-10">
          <Link
            href="/explore"
            className="text-gray-200 hover:text-yellow-400 transition"
          >
            Explore
          </Link>
          <Link
            href="/destinations"
            className="text-gray-200 hover:text-yellow-400 transition"
          >
            Destinations
          </Link>
          <Link
            href="/bookings"
            className="text-gray-200 hover:text-yellow-400 transition"
          >
            Bookings
          </Link>
          <Link
            href="/contact"
            className="text-gray-200 hover:text-yellow-400 transition"
          >
            Contact
          </Link>
        </div>

        {/* Right: Auth Buttons (Desktop) */}
        <div className="hidden md:flex gap-4">
          <Link
            href="/auth/login"
            className="px-4 py-2 rounded-xl border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black transition"
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            className="px-4 py-2 rounded-xl bg-yellow-400 text-black font-semibold shadow-md hover:bg-yellow-500 transition"
          >
            Sign Up
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-yellow-400 focus:outline-none"
        >
          {menuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.4 }}
            className="md:hidden absolute top-16 left-0 w-full bg-[#0a0f29]/95 backdrop-blur-md shadow-lg p-6 space-y-6"
          >
            {/* Centered Nav Links */}
            <div className="flex flex-col items-center gap-6">
              <Link
                href="/explore"
                onClick={() => setMenuOpen(false)}
                className="text-gray-200 hover:text-yellow-400 transition"
              >
                Explore
              </Link>
              <Link
                href="/destinations"
                onClick={() => setMenuOpen(false)}
                className="text-gray-200 hover:text-yellow-400 transition"
              >
                Destinations
              </Link>
              <Link
                href="/bookings"
                onClick={() => setMenuOpen(false)}
                className="text-gray-200 hover:text-yellow-400 transition"
              >
                Bookings
              </Link>
              <Link
                href="/contact"
                onClick={() => setMenuOpen(false)}
                className="text-gray-200 hover:text-yellow-400 transition"
              >
                Contact
              </Link>
            </div>

            {/* Bottom Auth Buttons */}
            <div className="flex flex-col gap-4 pt-6 border-t border-yellow-400/30">
              <Link
                href="/auth/login"
                onClick={() => setMenuOpen(false)}
                className="px-4 py-2 rounded-xl border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black transition text-center"
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                onClick={() => setMenuOpen(false)}
                className="px-4 py-2 rounded-xl bg-yellow-400 text-black font-semibold shadow-md hover:bg-yellow-500 transition text-center"
              >
                Sign Up
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
