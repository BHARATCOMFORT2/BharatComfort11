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
      try {
        const q = query(
          collection(db, "peopleProfiles"),
          where("isActive", "==", true),
          limit(6)
        );

        const snap = await getDocs(q);
        setPeople(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        );
      } catch (err) {
        console.error("Failed to load peopleProfiles", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  /* ================= LOADING STATE ================= */
  if (loading) {
    return (
      <section className="py-20 text-center text-gray-400">
        Loading investors & contributors…
      </section>
    );
  }

  /* ================= EMPTY STATE ================= */
  if (!people.length) {
    return (
      <section className="py-20 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Investors & Contributors
        </h2>
        <p className="text-gray-400">
          Our investor & contributor network is coming soon.
        </p>

        <div className="mt-6 flex justify-center gap-4">
          <Link href="/invest-with-us" className="text-blue-400 font-medium">
            Become an Investor →
          </Link>
        </div>
      </section>
    );
  }

  /* ================= NORMAL STATE ================= */
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-white mb-3">
          Investors & Contributors
        </h2>
        <p className="text-center text-gray-400 mb-10">
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

        <div className="text-center mt-10 flex justify-center gap-6">
          <Link href="/investors" className="text-blue-400 font-medium">
            View Investors →
          </Link>
          <Link href="/contributors" className="text-blue-400 font-medium">
            View Contributors →
          </Link>
        </div>
      </div>
    </section>
  );
}
