// hooks/useListings.ts
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Listing {
  id: string;
  title: string;
  description: string;
  category: "hotel" | "restaurant" | "travel" | "other";
  location?: string;
  priceRange?: string;
  images?: string[];
  partnerId: string;
  featured?: boolean;
  createdAt?: any;
  [key: string]: any;
}

export function useListings({
  partnerId,
  featured,
  limitCount,
}: {
  partnerId?: string;
  featured?: boolean;
  limitCount?: number;
} = {}) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = query(collection(db, "listings"), orderBy("createdAt", "desc"));

    if (partnerId) {
      q = query(q, where("partnerId", "==", partnerId));
    }

    if (featured !== undefined) {
      q = query(q, where("featured", "==", featured));
    }

    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Listing)
      );
      setListings(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [partnerId, featured, limitCount]);

  return { listings, loading };
}
