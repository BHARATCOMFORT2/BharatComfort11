"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  return (
    <header className="sticky top-0 z-40 bg-white shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-blue-600">
          BharatComfort
        </Link>

<Link href="/user/bookings" className="hover:underline">
  My Bookings
</Link>

        {/* Navigation */}
        <nav className="hidden md:flex gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "hover:text-blue-600 transition-colors",
                pathname === link.href ? "text-blue-600 font-semibold" : "text-gray-700"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="px-4 py-2 text-sm rounded-xl border border-gray-300 hover:bg-gray-100"
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            className="px-4 py-2 text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700"
          >
            Register
          </Link>
        </div>
      </div>
    </header>
  );
}
