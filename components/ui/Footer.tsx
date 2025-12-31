import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-10 grid md:grid-cols-4 gap-8">
        {/* About */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-3">BharatComfort</h2>
          <p className="text-sm">
            Your global platform for hotels, restaurants, and travel experiences.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Quick Links</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/listings" className="hover:text-white">Listings</Link></li>
            <li><Link href="/stories" className="hover:text-white">Stories</Link></li>
            <li><Link href="/partners" className="hover:text-white">Partners</Link></li>
            <li><Link href="/about" className="hover:text-white">About Us</Link></li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Support</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
            <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
          </ul>
        </div>

        {/* Social */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Follow Us</h3>
          <div className="flex gap-4">
            <Link href="https://facebook.com" target="https://www.facebook.com/share/1Bhtdthq2x/">🌐</Link>
            <Link href="https://twitter.com" target="_blank">🐦</Link>
            <Link href="https://instagram.com" target="https://www.instagram.com/bharatcomfort?igsh=eHB0bWF2ZWszNGI0">📸</Link>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-700 text-center py-4 text-sm">
        © {new Date().getFullYear()} BharatComfort. All rights reserved.
      </div>
    </footer>
  );
}
