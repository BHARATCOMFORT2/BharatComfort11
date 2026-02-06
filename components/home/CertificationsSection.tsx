"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase-client";

export default function CertificationsSection() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const q = query(
        collection(db, "certifications"),
        where("isActive", "==", true),
        orderBy("displayOrder", "asc")
      );
      const snap = await getDocs(q);
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    load();
  }, []);

  if (!items.length) return null;

  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-10">
          Compliance & Certifications
        </h2>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {items.map(c => (
            <div key={c.id} className="bg-white/5 border rounded-xl p-6 text-center">
              <h3 className="font-semibold mb-1">{c.title}</h3>
              <p className="text-sm text-gray-400 mb-3">{c.authority}</p>
              <a
                href={c.certificateUrl}
                target="_blank"
                className="text-blue-500 font-medium"
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
