"use client";

import Link from "next/link";
import { Facebook, Twitter, Instagram, Youtube } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-[#fff8f0] via-[#fff5e8] to-[#fff1dd] text-yellow-900 pt-16 pb-6 mt-16">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-10">
        {/* Brand Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-yellow-800 mb-2">BharatComfort</h2>
          <p className="text-yellow-700/80">
            Your premium travel companion — discover comfort, culture, and
            curated journeys across India with a royal touch.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">Quick Links</h3>
          <ul className="space-y-2">
            {["Listings", "Stories", "Partners", "About"].map((link) => (
              <li key={link}>
                <Link
                  href={`/${link.toLowerCase()}`}
                  className="hover:text-yellow-600 transition-colors duration-200"
                >
                  {link}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Support Links */}
        <div>
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">Support</h3>
          <ul className="space-y-2">
            {[
              { label: "Help Center", href: "/help" },
              { label: "Contact Us", href: "/contact" },
              { label: "FAQs", href: "/faqs" },
              { label: "Terms & Conditions", href: "/terms" },
              { label: "Privacy Policy", href: "/privacy" },
            ].map(({ label, href }) => (
              <li key={label}>
                <Link
                  href={href}
                  className="hover:text-yellow-600 transition-colors duration-200"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Social Media Links */}
        <div>
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">Follow Us</h3>
          <div className="flex gap-4">
            <Link href="#" className="hover:opacity-70 transition-opacity">
              <Facebook size={22} />
            </Link>
            <Link href="#" className="hover:opacity-70 transition-opacity">
              <Twitter size={22} />
            </Link>
            <Link href="#" className="hover:opacity-70 transition-opacity">
              <Instagram size={22} />
            </Link>
            <Link href="#" className="hover:opacity-70 transition-opacity">
              <Youtube size={22} />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-yellow-200/40 mt-10 pt-4 text-center text-sm text-yellow-700/80">
        © {new Date().getFullYear()} BharatComfort. All rights reserved.
      </div>
    </footer>
  );
}
