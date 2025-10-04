"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${scrolled ? "bg-black/70 backdrop-blur-md shadow-md" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between py-4 px-6">
        <Link href="/" className="text-2xl font-bold text-yellow-400">BharatComfort</Link>

        <div className="hidden md:flex flex-1 justify-center gap-10">
          <Link href="/explore" className="text-gray-200 hover:text-yellow-400 transition">Explore</Link>
          <Link href="/destinations" className="text-gray-200 hover:text-yellow-400 transition">Destinations</Link>
          <Link href="/bookings" className="text-gray-200 hover:text-yellow-400 transition">Bookings</Link>
          <Link href="/contact" className="text-gray-200 hover:text-yellow-400 transition">Contact</Link>
        </div>

        <div className="hidden md:flex gap-4">
          <Link href="/auth/login" className="px-4 py-2 rounded-xl border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black transition">Login</Link>
          <Link href="/auth/register" className="px-4 py-2 rounded-xl bg-yellow-400 text-black font-semibold shadow-md hover:bg-yellow-500 transition">Sign Up</Link>
        </div>

        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-yellow-400 focus:outline-none">
          {menuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.25 }} className="md:hidden absolute top-16 left-0 w-full bg-black/80 backdrop-blur-md shadow-lg p-6 space-y-6">
            <div className="flex flex-col items-center gap-6">
              <Link href="/explore" onClick={() => setMenuOpen(false)} className="text-gray-200 hover:text-yellow-400 transition">Explore</Link>
              <Link href="/destinations" onClick={() => setMenuOpen(false)} className="text-gray-200 hover:text-yellow-400 transition">Destinations</Link>
              <Link href="/bookings" onClick={() => setMenuOpen(false)} className="text-gray-200 hover:text-yellow-400 transition">Bookings</Link>
              <Link href="/contact" onClick={() => setMenuOpen(false)} className="text-gray-200 hover:text-yellow-400 transition">Contact</Link>
            </div>

            <div className="flex flex-col gap-4 pt-6 border-t border-yellow-400/30">
              <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="px-4 py-2 rounded-xl border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black text-center">Login</Link>
              <Link href="/auth/register" onClick={() => setMenuOpen(false)} className="px-4 py-2 rounded-xl bg-yellow-400 text-black font-semibold shadow-md hover:bg-yellow-500 text-center">Sign Up</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
