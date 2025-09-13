// hooks/usePendingPartners.ts
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";

export interface PartnerProfile {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  createdAt?: any;
  [key: string]: any;
}

export function usePendingPartners() {
  const [partners, setPartners] = useState<PartnerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "partners"),
      where("role", "==", "partner"),
      where("isActive", "==", false),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: PartnerProfile[] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPartners(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { partners, loading };
}
