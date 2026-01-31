"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import PeopleCard from "@/components/public/PeopleCard";

export default function InvestorsPage() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const q = query(
        collection(db, "peopleProfiles"),
        where("type", "==", "investor"),
        where("isActive", "==", true)
      );
      const snap = await getDocs(q);
      setData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    };
    load();
  }, []);

  return (
    <main className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Our Investors</h1>

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {data.map((p) => (
          <PeopleCard key={p.id} {...p} />
        ))}
      </div>
    </main>
  );
}
