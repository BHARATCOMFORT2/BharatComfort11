"use client";

import { useEffect, useState } from "react";

/**
 * Fetches bookings through secure API (session cookie auth)
 */
export function useBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadBookings() {
    try {
      setLoading(true);

      const res = await fetch("/api/bookings", {
        method: "GET",
        credentials: "include", // 🔥 VERY IMPORTANT: sends __session cookie
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        console.warn("Bookings API error:", data.error || data);
        setBookings([]);
        setLoading(false);
        return;
      }

      setBookings(data.bookings || []);
    } catch (e) {
      console.error("Bookings fetch failed:", e);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  return { bookings, loading };
}
