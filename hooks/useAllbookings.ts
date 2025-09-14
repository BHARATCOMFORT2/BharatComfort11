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
