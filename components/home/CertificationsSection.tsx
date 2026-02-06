"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, where, query } from "firebase/firestore";
import { db } from "@/lib/firebase-client";

type Certificate = {
  id: string;
  title: string;
  authority?: string;
  certificateUrl: string;
  displayOrder?: number;
};

export default function CertificationsSection() {
  const [items, setItems] = useState<Certificate[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(
          collection(db, "certifications"),
          where("isActive", "==", true)
        );

        const snap = await getDocs(q);

        const data = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as any),
        }));

        // ✅ SORT CLIENT SIDE (NO INDEX REQUIRED)
        data.sort(
          (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
        );

        setItems(data);
      } catch (err: any) {
        console.error("❌ Certifications load failed:", err);
        setError("Failed to load certifications");
      }
    };

    load();
  }, []);

  /* ❌ HARD FAIL AVOIDED */
  if (error) return null;
  if (!items.length) return null;

  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-10">
          Compliance & Certifications
        </h2>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {items.map(c => (
            <div
              key={c.id}
              className="bg-white/5 border border-white/10 rounded-xl p-6 text-center"
            >
              <h3 className="font-semibold mb-1">{c.title}</h3>

              {c.authority && (
                <p className="text-sm text-gray-400 mb-3">
                  {c.authority}
                </p>
              )}

              <a
                href={c.certificateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-blue-400 font-medium hover:underline"
              >
                View Certificate →
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
