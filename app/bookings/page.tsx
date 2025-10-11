"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import Link from "next/link";
import Loading from "@/app/components/Loading";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "bookings"),
      where("userId", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setBookings(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) return <Loading />;

  if (bookings.length === 0)
    return <p className="text-center mt-10 text-gray-500">No bookings yet.</p>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Bookings</h1>

      <div className="grid grid-cols-1 gap-4">
        {bookings.map((b) => (
          <Link
            key={b.id}
            href={`/bookings/${b.id}`}
            className="flex justify-between items-center p-4 border rounded-xl hover:shadow-md transition"
          >
            <div>
              <p className="font-semibold">
                Booking ID: <span className="text-indigo-600">{b.id}</span>
              </p>
              <p className="text-gray-600">Status: 
                <span
                  className={`font-bold ml-1 ${
                    b.status === "paid" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {b.status.toUpperCase()}
                </span>
              </p>
              <p className="text-gray-500 text-sm">
                Booked on:{" "}
                {b.createdAt?.toDate
                  ? b.createdAt.toDate().toLocaleString()
                  : new Date(b.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="text-indigo-600 font-semibold">→ View</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
