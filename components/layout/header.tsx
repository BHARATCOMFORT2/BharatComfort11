"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Listings", href: "/listings" },
    { label: "Stories", href: "/stories" },
    { label: "Chat", href: "/chat" },
    { label: "Bookings", href: "/bookings" },
    { label: "Payments", href: "/payments/manage" },
  ];

  return (
    <header className="bg-gray-900 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        
        {/* Logo / Brand */}
        <Link href="/" className="text-lg font-bold tracking-wide">
          BHARATCOMFORT11
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`hover:text-blue-400 ${
                pathname === item.href ? "text-blue-400" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Auth Buttons */}
        <div className="space-x-3 hidden md:flex">
          <Link
            href="/auth/login"
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            Log In
          </Link>
          <Link
            href="/auth/register"
            className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </header>
  );
}
