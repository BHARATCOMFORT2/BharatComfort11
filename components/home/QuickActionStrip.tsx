"use client";

import { useEffect, useState } from "react";
import { Plane, Train, Bus, Hotel } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

// Map icon names to Lucide icons
const iconMap: Record<string, any> = {
  Plane,
  Train,
  Bus,
  Hotel,
};

// Type for action items
interface Action {
  label: string;
  href: string;
  icon: string;
}

// Default actions (fallback)
const defaultActions: Action[] = [
  { label: "Plan by Road", href: "/travel/roadways", icon: "Bus" },
  { label: "Plan by Rail", href: "/travel/railways", icon: "Train" },
  { label: "Plan by Air", href: "/travel/airways", icon: "Plane" },
  { label: "Find Stays", href: "/listings", icon: "Hotel" },
];

export default function QuickActionStrip() {
  const [actions, setActions] = useState<Action[]>(defaultActions);
  const [title, setTitle] = useState("Quick Travel Planner");
  const [subtitle, setSubtitle] = useState("Roadways • Railways • Airways • Stays");

  useEffect(() => {
    // ✅ Listen to Firestore document changes in real time
    const ref = doc(db, "homepage", "QuickActions");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.actions) && data.actions.length > 0) {
          setActions(data.actions);
        } else {
          setActions(defaultActions);
        }
        setTitle(data.title || "Quick Travel Planner");
        setSubtitle(data.subtitle || "Roadways • Railways • Airways • Stays");
      } else {
        // If Firestore doc missing, keep default actions
        setActions(defaultActions);
      }
    });

    return () => unsub();
  }, []);

  return (
    <section className="py-16 bg-gradient-to-br from-[#fff8f0] via-[#fff5e8] to-[#fff1dd]">
      <div className="max-w-7xl mx-auto px-6 text-center mb-10">
        <h2 className="text-3xl font-bold text-yellow-900 mb-2">{title}</h2>
        <p className="text-gray-700">{subtitle}</p>
      </div>

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        {actions.map(({ href, label, icon }, index) => {
          const Icon = iconMap[icon] || Plane;
          return (
            <motion.div
              key={`${href}-${index}`}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.15 }}
              whileHover={{ scale: 1.05 }}
            >
              <Link
                href={href}
                className="relative flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/60 backdrop-blur-lg shadow-lg hover:shadow-xl transition-all border border-yellow-100"
              >
                <Icon className="h-10 w-10 text-yellow-700" />
                <span className="font-semibold text-yellow-900">{label}</span>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-yellow-100/20 via-yellow-200/10 to-transparent opacity-0 hover:opacity-30 transition-opacity duration-500 pointer-events-none"></div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
