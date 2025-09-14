"use client";

import useAllBookings from '@/hooks/useAllBookings';
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

export function useAllBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with Firestore/Backend fetch
    setTimeout(() => {
      setBookings([
        { id: "1", name: "Test Booking", status: "confirmed" }
      ]);
      setLoading(false);
    }, 500);
  }, []);

  return { bookings, loading };
}

export function useAllBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setBookings(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { bookings, loading };
}
