"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <header className="sticky top-0 z-50 shadow-lg bg-gradient-to-r from-blue-950 via-indigo-900 to-blue-950">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link
          href="/"
          className="text-2xl font-extrabold tracking-wide text-yellow-400"
        >
          BharatComfort
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative font-medium transition-all duration-200 hover:text-yellow-300",
                pathname === link.href
                  ? "text-yellow-400 font-semibold"
                  : "text-gray-200"
              )}
            >
              {link.label}
              {pathname === link.href && (
                <span className="absolute left-0 -bottom-1 h-[2px] w-full bg-yellow-400 rounded-full"></span>
              )}
            </Link>
          ))}
        </nav>

        {/* Right Side Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/user/bookings"
            className="text-sm font-medium text-gray-200 hover:text-yellow-300 transition"
          >
            My Bookings
          </Link>
          <Link
            href="/auth/login"
            className="px-4 py-2 text-sm rounded-lg bg-white text-blue-950 font-semibold shadow hover:bg-gray-100 transition"
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            className="px-4 py-2 text-sm rounded-lg bg-yellow-500 text-blue-950 font-semibold shadow hover:bg-yellow-400 transition"
          >
            Register
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-yellow-400 hover:text-yellow-300 transition"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-gradient-to-r from-blue-950 via-indigo-900 to-blue-950 px-6 pb-6 space-y-4 shadow-lg">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                "block text-gray-200 hover:text-yellow-300 transition",
                pathname === link.href && "text-yellow-400 font-semibold"
              )}
            >
              {link.label}
            </Link>
          ))}
          <hr className="border-gray-700" />
          <Link
            href="/user/bookings"
            onClick={() => setIsOpen(false)}
            className="block text-gray-200 hover:text-yellow-300"
          >
            My Bookings
          </Link>
          <Link
            href="/auth/login"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 rounded-lg bg-white text-blue-950 font-semibold hover:bg-gray-100 transition"
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 rounded-lg bg-yellow-500 text-blue-950 font-semibold hover:bg-yellow-400 transition"
          >
            Register
          </Link>
        </div>
      )}
    </header>
  );
}
