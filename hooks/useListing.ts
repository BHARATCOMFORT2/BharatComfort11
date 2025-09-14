"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Listing } from "./useListings";

export function useListing(id: string | null) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const ref = doc(db, "listings", id);
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      if (snapshot.exists()) {
        setListing({ id: snapshot.id, ...snapshot.data() } as Listing);
      } else {
        setListing(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  return { listing, loading };
}
