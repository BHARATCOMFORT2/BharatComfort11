// hooks/useReviews.ts
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Review {
  id: string;
  listingId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: any;
}

/**
 * Fetch reviews for a specific listing.
 */
export function useReviews(listingId: string | null) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!listingId) return;

    const q = query(
      collection(db, "reviews"),
      where("listingId", "==", listingId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Review)
      );
      setReviews(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [listingId]);

  return { reviews, loading };
}

/**
 * Fetch reviews written by a specific user.
 */
export function useUserReviews(userId: string | null) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "reviews"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Review)
      );
      setReviews(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { reviews, loading };
}
