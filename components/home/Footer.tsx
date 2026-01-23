"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Facebook, Twitter, Instagram, Youtube } from "lucide-react";

import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { db, storage } from "@/lib/firebase-client";

/* ================================
   Investors & Contributors Section
================================ */

type Person = {
  id: string;
  name: string;
  type: "investor" | "contributor";
  contribution: string;
  qualification?: string;
  photoPath: string;
  photoURL?: string;
};

function InvestorsContributors() {
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => {
    const fetchPeople = async () => {
      const q = query(
        collection(db, "investorsContributors"),
        where("isVisible", "==", true),
        orderBy("order", "asc")
      );

      const snap = await getDocs(q);

      const list = await Promise.all(
        snap.docs.map(async (doc) => {
          const data = doc.data() as Person;

          let photoURL = "";
          if (data.photoPath) {
            photoURL = await getDownloadURL(
              ref(storage, data.photoPath)
            );
          }

          return {
            id: doc.id,
            ...data,
            photoURL,
          };
        })
      );

      setPeople(list.slice(0, 6)); // footer limit
    };

    fetchPeople();
  }, []);

  if (!people.length) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 mb-14">
      <h3 className="text-xl font-semibold text-yellow-800 text-center mb-2">
        Investors & Contributors
      </h3>

      <p className="text-center text-sm text-yellow-700/70 mb-6">
        Supported by investors and contributors who believe in our vision
      </p>

      <div className="flex flex-wrap justify-center gap-8">
        {people.map((p) => (
          <div key={p.id} className="text-center max-w-[180px]">
            <img
              src={p.photoURL || "/avatar.png"}
              alt={p.name}
              className="w-14 h-14 rounded-full mx-auto mb-2 object-cover border border-yellow-300"
            />

            <p className="text-sm font-medium text-yellow-900">
              {p.name}
            </p>

            <p className="text-xs text-yellow-800/80 mt-1">
              {p.type === "investor" ? "Investor" : p.contribution}
            </p>

            {p.qualification && (
              <p className="text-xs text-yellow-700/60 mt-1">
                {p.qualification}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================
   Footer
================================ */

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-[#fff8f0] via-[#fff5e8] to-[#fff1dd] text-yellow-900 pt-16 pb-6 mt-16">

      {/* Investors & Contributors */}
      <InvestorsContributors />

      {/* GRID */}
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-10">
        {/* Brand Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-yellow-800 mb-2">
            BharatComfort
          </h2>
          <p className="text-yellow-700/80">
            Your premium travel companion — discover comfort, culture, and
            curated journeys across India with a royal touch.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">
            Quick Links
          </h3>
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
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">
            Support
          </h3>
          <ul className="space-y-2">
            {[
              { label: "Help Center", href: "/help-center" },
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
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">
            Follow Us
          </h3>
          <div className="flex gap-4">
            <a
              href="https://www.facebook.com/share/1Bhtdthq2x/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-70 transition-opacity"
            >
              <Facebook size={22} />
            </a>

            <a
              href="https://www.instagram.com/bharatcomfort?igsh=eHB0bWF2ZWszNGI0"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-70 transition-opacity"
            >
              <Instagram size={22} />
            </a>

            <span className="opacity-40 cursor-not-allowed" title="Coming soon">
              <Twitter size={22} />
            </span>

            <span className="opacity-40 cursor-not-allowed" title="Coming soon">
              <Youtube size={22} />
            </span>
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
