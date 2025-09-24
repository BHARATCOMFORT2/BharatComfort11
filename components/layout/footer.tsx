"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-8 mt-10">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Brand / About */}
        <div>
          <h2 className="text-lg font-semibold text-white">BHARATCOMFORT11</h2>
          <p className="text-sm mt-2">
            Your trusted travel companion – discover, book, and explore with ease.
          </p>
        </div>

        {/* Navigation */}
        <div>
          <h3 className="text-md font-semibold text-white mb-2">Quick Links</h3>
          <ul className="space-y-1 text-sm">
            <li>
              <Link href="/" className="hover:text-white">Home</Link>
            </li>
            <li>
              <Link href="/listings" className="hover:text-white">Listings</Link>
            </li>
            <li>
              <Link href="/stories" className="hover:text-white">Stories</Link>
            </li>
            <li>
              <Link href="/chat" className="hover:text-white">Chat</Link>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h3 className="text-md font-semibold text-white mb-2">Legal</h3>
          <ul className="space-y-1 text-sm">
            <li>
              <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-white">Terms & Conditions</Link>
            </li>
            <li>
              <Link href="/refund" className="hover:text-white">Refund Policy</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} BHARATCOMFORT11. All rights reserved.
      </div>
    </footer>
  );
}
