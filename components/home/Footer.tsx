"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Facebook, Twitter, Instagram, Youtube } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface FooterData {
  brand: { name: string; description: string };
  quickLinks: { title: string; href: string }[];
  supportLinks: { title: string; href: string }[];
  socials: { platform: string; url: string }[];
}

export default function Footer() {
  const [footer, setFooter] = useState<FooterData | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "footer"), (snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data() as FooterData;
        setFooter(data);
      }
    });

    return () => unsubscribe();
  }, []);

  if (!footer) return <p className="text-center py-6">Loading footer...</p>;

  const socialIcons: Record<string, JSX.Element> = {
    facebook: <Facebook size={22} />,
    twitter: <Twitter size={22} />,
    instagram: <Instagram size={22} />,
    youtube: <Youtube size={22} />,
  };

  return (
    <footer className="bg-gradient-to-br from-[#fff8f0] via-[#fff5e8] to-[#fff1dd] text-yellow-900 pt-16 pb-6 mt-16">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-yellow-800 mb-2">{footer.brand.name}</h2>
          <p className="text-yellow-700/80">{footer.brand.description}</p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">Quick Links</h3>
          <ul className="space-y-2">
            {footer.quickLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-yellow-600 transition">
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Support */}
        <div>
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">Support</h3>
          <ul className="space-y-2">
            {footer.supportLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-yellow-600 transition">
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Social Media */}
        <div>
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">Follow Us</h3>
          <div className="flex gap-4">
            {footer.socials.map((social) => (
              <Link key={social.platform} href={social.url} target="_blank" rel="noopener noreferrer" className="hover:text-yellow-600 transition">
                {socialIcons[social.platform.toLowerCase()]}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-yellow-200/40 mt-10 pt-4 text-center text-sm text-yellow-700/80">
        © {new Date().getFullYear()} {footer.brand.name}. All rights reserved.
      </div>
    </footer>
  );
}
