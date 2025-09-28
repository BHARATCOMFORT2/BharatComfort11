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

// Backgrounds based on route
const bgImages: Record<string, string> = {
  "/": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80",
  "/listings": "https://images.unsplash.com/photo-1501117716987-c8e004d24d4d?auto=format&fit=crop&w=1920&q=80",
  "/stories": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1920&q=80",
  "/partners": "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1920&q=80",
  "/about": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1920&q=80",
};

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const backgroundImage = bgImages[pathname] || bgImages["/"];

  return (
    <header
      className="sticky top-0 z-50 shadow-lg bg-cover bg-center"
      style={{ backgroundImage: `url('${backgroundImage}')` }}
    >
      <div className="bg-gradient-to-r from-blue-900/95 to-indigo-900/95">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          {/* Left: Logo */}
          <div className="flex-shrink-0">
            <Link
              href="/"
              className="text-2xl font-extrabold tracking-wide text-yellow-400 hover:text-yellow-300 transition"
            >
              BharatComfort
            </Link>
          </div>

          {/* Center: Desktop Navigation */}
          <nav className="hidden md:flex flex-1 justify-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative font-medium tracking-wide transition-all duration-200 hover:text-yellow-300",
                  pathname === link.href
                    ? "text-white font-semibold"
                    : "text-gray-100"
                )}
              >
                {link.label}
                {pathname === link.href && (
                  <span className="absolute left-0 -bottom-1 h-[2px] w-full bg-yellow-400 rounded-full"></span>
                )}
              </Link>
            ))}
          </nav>

          {/* Right: Bookings + Auth */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/user/bookings"
              className="text-sm font-medium text-gray-100 hover:text-yellow-300 transition"
            >
              My Bookings
            </Link>
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm rounded-lg border border-yellow-400 text-yellow-400 font-semibold hover:bg-yellow-400 hover:text-black transition"
            >
              Login
            </Link>
            <Link
              href="/auth/register"
              className="px-4 py-2 text-sm rounded-lg bg-yellow-400 text-black font-semibold shadow hover:bg-yellow-500 transition"
            >
              Register
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden text-white hover:text-yellow-300 transition"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden bg-gradient-to-r from-blue-900/95 to-indigo-900/95 px-6 pb-6 space-y-4 shadow-lg">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "block text-gray-100 hover:text-yellow-300 transition",
                  pathname === link.href && "text-white font-semibold"
                )}
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-gray-600" />
            <Link
              href="/user/bookings"
              onClick={() => setIsOpen(false)}
              className="block text-gray-100 hover:text-yellow-300"
            >
              My Bookings
            </Link>
            <Link
              href="/auth/login"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 rounded-lg border border-yellow-400 text-yellow-400 font-semibold hover:bg-yellow-400 hover:text-black transition text-center"
            >
              Login
            </Link>
            <Link
              href="/auth/register"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 rounded-lg bg-yellow-400 text-black font-semibold shadow hover:bg-yellow-500 transition text-center"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
