"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import PeopleCard from "@/components/public/PeopleCard";
import Link from "next/link";

type Person = {
  id: string;
  name: string;
  photoUrl: string;
  role: string;
  contribution?: string;
};

export default function PeopleSection() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const q = query(
        collection(db, "peopleProfiles"),
        where("isActive", "==", true),
        limit(6)
      );

      const snap = await getDocs(q);
      setPeople(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      );
      setLoading(false);
    };

    load();
  }, []);

  if (loading) return null;

  return (
    <section className="py-14 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-3">
          Investors & Contributors
        </h2>
        <p className="text-center text-gray-600 mb-8">
          The people who believe in and build BharatComfort
        </p>

        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {people.map((p) => (
            <PeopleCard
              key={p.id}
              photoUrl={p.photoUrl}
              name={p.name}
              role={p.role}
              contribution={p.contribution}
            />
          ))}
        </div>

        <div className="text-center mt-8 flex justify-center gap-4">
          <Link href="/investors" className="text-blue-600 font-medium">
            View Investors →
          </Link>
          <Link href="/contributors" className="text-blue-600 font-medium">
            View Contributors →
          </Link>
        </div>
      </div>
    </section>
  );
}
