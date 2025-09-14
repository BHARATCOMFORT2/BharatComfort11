"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  description?: string;
  type?: string; // e.g., "listing", "story", "event"
  referenceId?: string; // link to related listing/story
  createdAt?: any;
}

/**
 * Hook for fetching all map pins (optionally filtered by type or referenceId).
 */
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

/**
 * Hook for fetching a single map pin by ID.
 */
export function useMapPin(id: string) {
  const [pin, setPin] = useState<MapPin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const ref = doc(db, "mapPins", id);

    const unsubscribe = onSnapshot(ref, (docSnap) => {
      if (docSnap.exists()) {
        setPin({ id: docSnap.id, ...docSnap.data() } as MapPin);
      } else {
        setPin(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  return { pin, loading };
}
