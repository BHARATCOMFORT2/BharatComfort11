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

// 🌍 Backgrounds based on route
const bgImages: Record<string, string> = {
  "/": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80", // Beach/Travel
  "/listings": "https://images.unsplash.com/photo-1501117716987-c8e004d24d4d?auto=format&fit=crop&w=1920&q=80", // Hotels
  "/stories": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1920&q=80", // City
  "/partners": "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1920&q=80", // Team/Partners
  "/about": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1920&q=80", // Mountains
};

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Pick background based on path (fallback = home)
  const backgroundImage = bgImages[pathname] || bgImages["/"];

  return (
    <header
      className="sticky top-0 z-50 shadow-lg bg-cover bg-center"
      style={{
        backgroundImage: `url('${backgroundImage}')`,
      }}
    >
      {/* Gradient Overlay */}
      <div className="bg-gradient-to-r from-blue-800/90 to-indigo-900/90">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          {/* Logo */}
          <Link
            href="/"
            className="text-2xl font-extrabold tracking-wide text-white"
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
                  "relative font-medium transition-all duration-200 hover:text-orange-300",
                  pathname === link.href
                    ? "text-white font-semibold"
                    : "text-gray-100"
                )}
              >
                {link.label}
                {pathname === link.href && (
                  <span className="absolute left-0 -bottom-1 h-[2px] w-full bg-orange-400 rounded-full"></span>
                )}
              </Link>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/user/bookings"
              className="text-sm font-medium text-gray-100 hover:text-orange-300 transition"
            >
              My Bookings
            </Link>
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm rounded-lg bg-white text-blue-700 font-semibold shadow hover:bg-gray-100 transition"
            >
              Login
            </Link>
            <Link
              href="/auth/register"
              className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white font-semibold shadow hover:bg-orange-600 transition"
            >
              Register
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white hover:text-orange-300 transition"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden bg-gradient-to-r from-blue-800/95 to-indigo-900/95 px-6 pb-6 space-y-4 shadow-lg">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "block text-gray-100 hover:text-orange-300 transition",
                  pathname === link.href && "text-white font-semibold"
                )}
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-gray-500" />
            <Link
              href="/user/bookings"
              onClick={() => setIsOpen(false)}
              className="block text-gray-100 hover:text-orange-300"
            >
              My Bookings
            </Link>
            <Link
              href="/auth/login"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 rounded-lg bg-white text-blue-700 font-semibold hover:bg-gray-100 transition"
            >
              Login
            </Link>
            <Link
              href="/auth/register"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 transition"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
