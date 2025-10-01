"use client";

import { Plane, Train, Bus, Hotel } from "lucide-react";
import Link from "next/link";

const actions = [
  { href: "/flights", label: "Flights", icon: Plane },
  { href: "/trains", label: "Trains", icon: Train },
  { href: "/buses", label: "Buses", icon: Bus },
  { href: "/stays", label: "Hotels & Stays", icon: Hotel },
];

export default function QuickActionStrip() {
  return (
    <section className="py-12 bg-gradient-to-r from-blue-950 via-indigo-900 to-blue-950">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 px-6">
        {actions.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-3 bg-white/10 hover:bg-yellow-400/20 rounded-2xl p-6 text-center shadow-lg transition"
          >
            <Icon className="h-8 w-8 text-yellow-400" />
            <span className="font-semibold text-white">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
