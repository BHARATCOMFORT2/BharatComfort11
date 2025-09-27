"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/listings", label: "Listings" },
  { href: "/stories", label: "Stories" },
  { href: "/partners", label: "Partners" },
  { href: "/about", label: "About" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link
          href="/"
          className="text-2xl font-bold"
          style={{ color: "var(--color-brand)" }}
        >
          BharatComfort
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative font-medium transition-colors",
                pathname === link.href && "font-semibold"
              )}
              style={{
                color:
                  pathname === link.href
                    ? "var(--color-brand)"
                    : "var(--color-neutral-700)",
              }}
            >
              {link.label}
              {pathname === link.href && (
                <span
                  className="absolute left-0 -bottom-1 h-[2px] w-full rounded-full"
                  style={{ backgroundColor: "var(--color-brand)" }}
                ></span>
              )}
            </Link>
          ))}
        </nav>

        {/* Right Side Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/user/bookings"
            className="text-sm font-medium hover:underline"
            style={{ color: "var(--color-neutral-700)" }}
          >
            My Bookings
          </Link>
          <Link href="/auth/login" className="btn border border-gray-300">
            Login
          </Link>
          <Link href="/auth/register" className="btn btn-primary">
            Register
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          style={{ color: "var(--color-neutral-700)" }}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="fixed top-0 left-0 z-40 h-full w-3/4 max-w-sm 
                         bg-gradient-to-b from-blue-50 to-white 
                         shadow-2xl rounded-r-2xl px-6 py-8 flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between mb-6">
                <span
                  className="text-xl font-bold"
                  style={{ color: "var(--color-brand)" }}
                >
                  BharatComfort
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-md hover:bg-gray-100"
                  aria-label="Close menu"
                >
                  <X size={24} className="text-gray-700" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="space-y-3 flex-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "block text-lg font-medium transition",
                      pathname === link.href
                        ? "text-blue-600 font-semibold"
                        : "text-gray-700 hover:text-blue-600"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <hr className="my-4 border-gray-300" />
                <Link
                  href="/user/bookings"
                  onClick={() => setIsOpen(false)}
                  className="block text-gray-700 hover:text-blue-600"
                >
                  My Bookings
                </Link>
              </div>

              {/* Actions at Bottom */}
              <div className="space-y-2">
                <Link
                  href="/auth/login"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm rounded-xl border border-gray-300 hover:bg-gray-100 transition text-center"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition text-center"
                >
                  Register
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
