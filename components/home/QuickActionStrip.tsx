"use client";

import { useEffect, useState } from "react";
import { Plane, Train, Bus, Hotel } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

// Map icon string to component
const iconMap: Record<string, any> = { Plane, Train, Bus, Hotel };

export default function QuickActionStrip() {
  const [actions, setActions] = useState<{ label: string; href: string; icon: string }[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "homepage", "quickActions"), (snap) => {
      if (snap.exists()) {
        setActions(snap.data().actions || []);
      }
    });
    return () => unsub();
  }, []);

  return (
    <section className="py-16 bg-gradient-to-br from-[#fff8f0] via-[#fff5e8] to-[#fff1dd]">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        {actions.map(({ href, label, icon }, index) => {
          const Icon = iconMap[icon] || Plane;
          return (
            <motion.div
              key={href}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              whileHover={{ scale: 1.05 }}
            >
              <Link
                href={href}
                className="relative flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/40 backdrop-blur-lg shadow-xl text-center transition-all"
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
