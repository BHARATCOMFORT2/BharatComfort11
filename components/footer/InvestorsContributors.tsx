"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { db, storage } from "@/lib/firebase-client";

type Person = {
  id: string;
  name: string;
  type: "investor" | "contributor";
  contribution: string;
  qualification?: string;
  photoPath: string;
  photoURL?: string;
};

export default function InvestorsContributors() {
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const q = query(
        collection(db, "investorsContributors"),
        where("isVisible", "==", true),
        orderBy("order", "asc")
      );

      const snap = await getDocs(q);

      const list = await Promise.all(
        snap.docs.map(async (doc) => {
          const data = doc.data() as Person;

          const photoURL = data.photoPath
            ? await getDownloadURL(ref(storage, data.photoPath))
            : "";

          return {
            id: doc.id,
            ...data,
            photoURL,
          };
        })
      );

      setPeople(list.slice(0, 6));
    };

    fetchData();
  }, []);

  if (!people.length) return null;

  return (
    <div className="border-t border-gray-800 pt-10 pb-8">
      <h3 className="text-center text-lg font-semibold text-white mb-2">
        Investors & Contributors
      </h3>

      <p className="text-center text-xs text-gray-400 mb-6">
        Supported by investors and contributors who believe in our vision
      </p>

      <div className="flex flex-wrap justify-center gap-8">
        {people.map((p) => (
          <div key={p.id} className="text-center max-w-[200px]">
            <img
              src={p.photoURL || "/avatar.png"}
              alt={p.name}
              className="w-16 h-16 rounded-full mx-auto mb-3 object-cover"
            />

            <p className="text-sm font-medium text-white">{p.name}</p>

            <p className="text-xs text-gray-300 mt-1">
              {p.type === "investor" ? "Investor" : p.contribution}
            </p>

            {p.qualification && (
              <p className="text-xs text-gray-400 mt-1">
                {p.qualification}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
