"use client";

import Link from "next/link";
import { Facebook, Twitter, Instagram, Youtube } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-blue-950 via-indigo-900 to-blue-950 text-gray-300 pt-12 pb-6 mt-16">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-10">
        {/* Brand */}
        <div>
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">
            BharatComfort
          </h2>
          <p className="text-gray-400">
            Your premium travel companion. Explore luxury, comfort, and culture
            across India with a royal touch.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-lg font-semibold text-yellow-400 mb-3">
            Quick Links
          </h3>
          <ul className="space-y-2">
            <li>
              <Link href="/listings" className="hover:text-yellow-300 transition">
                Listings
              </Link>
            </li>
            <li>
              <Link href="/stories" className="hover:text-yellow-300 transition">
                Stories
              </Link>
            </li>
            <li>
              <Link href="/partners" className="hover:text-yellow-300 transition">
                Partners
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-yellow-300 transition">
                About
              </Link>
            </li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h3 className="text-lg font-semibold text-yellow-400 mb-3">
            Support
          </h3>
          <ul className="space-y-2">
            <li>
              <Link href="/help" className="hover:text-yellow-300 transition">
                Help Center
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-yellow-300 transition">
                Contact Us
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-yellow-300 transition">
                Terms & Conditions
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-yellow-300 transition">
                Privacy Policy
              </Link>
            </li>
          </ul>
        </div>

        {/* Social Media */}
        <div>
          <h3 className="text-lg font-semibold text-yellow-400 mb-3">
            Follow Us
          </h3>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-yellow-300 transition">
              <Facebook size={22} />
            </Link>
            <Link href="#" className="hover:text-yellow-300 transition">
              <Twitter size={22} />
            </Link>
            <Link href="#" className="hover:text-yellow-300 transition">
              <Instagram size={22} />
            </Link>
            <Link href="#" className="hover:text-yellow-300 transition">
              <Youtube size={22} />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-700 mt-10 pt-4 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} BharatComfort. All rights reserved.
      </div>
    </footer>
  );
}
