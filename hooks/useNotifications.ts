"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Notification {
  id: string;
  userId: string; // recipient (user, partner, or admin)
  title: string;
  message: string;
  type?: string; // e.g., "listing", "offer", "system"
  read: boolean;
  createdAt: any;
}

/**
 * Hook for fetching notifications for a specific user/partner/admin.
 */
export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Notification)
      );
      setNotifications(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { notifications, loading };
}
