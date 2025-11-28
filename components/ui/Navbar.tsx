"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  // Detect scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Detect logged-in user by checking session cookie
  useEffect(() => {
    const cookies = document.cookie.split("; ").map((c) => c.trim());
    const hasSession = cookies.some((c) => c.startsWith("__session="));
    setLoggedIn(hasSession);
  }, []);

  // Logout
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    document.cookie = "__session=; Max-Age=0; path=/";
    setLoggedIn(false);
    window.location.href = "/auth/login";
  }

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        scrolled
          ? "bg-black/70 backdrop-blur-md shadow-md"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between py-4 px-6">
        <Link href="/" className="text-2xl font-bold text-yellow-400">
          BharatComfort
        </Link>

        {/* Desktop Links */}
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

        {/* ✅ Auth Buttons + Staff Portal (DESKTOP) */}
        <div className="hidden md:flex gap-4">
          {!loggedIn ? (
            <>
              {/* ✅ Staff Portal */}
              <Link
                href="/staff"
                className="px-4 py-2 rounded-xl border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black transition"
              >
                Staff Portal
              </Link>

              {/* ✅ Login */}
              <Link
                href="/auth/login"
                className="px-4 py-2 rounded-xl border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black transition"
              >
                Login
              </Link>

              {/* ✅ Sign Up */}
              <Link
                href="/auth/register"
                className="px-4 py-2 rounded-xl bg-yellow-400 text-black font-semibold shadow-md hover:bg-yellow-500 transition"
              >
                Sign Up
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-xl border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black transition"
              >
                Dashboard
              </Link>

              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl bg-red-500 text-white font-semibold shadow-md hover:bg-red-600 transition"
              >
                Logout
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-yellow-400 focus:outline-none"
        >
          {menuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* ✅ Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="md:hidden absolute top-16 left-0 w-full bg-black/80 backdrop-blur-md shadow-lg p-6 space-y-6"
          >
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

            {/* ✅ Auth Buttons + Staff Portal (MOBILE) */}
            <div className="flex flex-col gap-4 pt-6 border-t border-yellow-400/30">
              {!loggedIn ? (
                <>
                  {/* ✅ Staff Portal */}
                  <Link
                    href="/staff"
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-2 rounded-xl border border-yellow-400 text-yellow-400 text-center hover:bg-yellow-400 hover:text-black"
                  >
                    Staff Portal
                  </Link>

                  {/* ✅ Login */}
                  <Link
                    href="/auth/login"
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-2 rounded-xl border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black text-center"
                  >
                    Login
                  </Link>

                  {/* ✅ Sign Up */}
                  <Link
                    href="/auth/register"
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-2 rounded-xl bg-yellow-400 text-black font-semibold shadow-md hover:bg-yellow-500 text-center"
                  >
                    Sign Up
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-2 rounded-xl border border-yellow-400 text-yellow-400 text-center"
                  >
                    Dashboard
                  </Link>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                    className="px-4 py-2 rounded-xl bg-red-500 text-white font-semibold shadow-md hover:bg-red-600 text-center"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
