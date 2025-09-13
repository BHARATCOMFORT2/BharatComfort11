"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  description?: string;
  type?: string; // e.g., "listing", "story", "event"
  referenceId?: string; // optional link to related doc
  createdAt?: any;
}

export function useMapPins(type?: string, referenceId?: string) {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = collection(db, "mapPins");

    if (type && referenceId) {
      q = query(
        collection(db, "mapPins"),
        where("type", "==", type),
        where("referenceId", "==", referenceId)
      );
    } else if (type) {
      q = query(collection(db, "mapPins"), where("type", "==", type));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as MapPin)
      );
      setPins(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [type, referenceId]);

  return { pins, loading };
}
