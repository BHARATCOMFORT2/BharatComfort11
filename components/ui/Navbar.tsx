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
    <header className="sticky top-0 z-40 bg-white shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-blue-600">
          BharatComfort
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative font-medium text-gray-700 hover:text-blue-600 transition-colors",
                pathname === link.href && "text-blue-600 font-semibold"
              )}
            >
              {link.label}
              {pathname === link.href && (
                <span className="absolute left-0 -bottom-1 h-[2px] w-full bg-blue-600 rounded-full"></span>
              )}
            </Link>
          ))}
        </nav>

        {/* Right Side Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/user/bookings"
            className="text-gray-700 hover:text-blue-600"
          >
            My Bookings
          </Link>
          <Link
            href="/auth/login"
            className="px-4 py-2 text-sm rounded-xl border border-gray-300 hover:bg-gray-100 transition"
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            className="px-4 py-2 text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Register
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-gray-700 hover:text-blue-600"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white shadow-lg px-6 pb-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                "block text-gray-700 hover:text-blue-600 transition-colors",
                pathname === link.href && "text-blue-600 font-semibold"
              )}
            >
              {link.label}
            </Link>
          ))}
          <hr className="my-2" />
          <Link
            href="/user/bookings"
            onClick={() => setIsOpen(false)}
            className="block text-gray-700 hover:text-blue-600"
          >
            My Bookings
          </Link>
          <Link
            href="/auth/login"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm rounded-xl border border-gray-300 hover:bg-gray-100 transition"
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Register
          </Link>
        </div>
      )}
    </header>
  );
}
