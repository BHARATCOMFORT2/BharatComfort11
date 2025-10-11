"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  DocumentData,
  DocumentReference,
  onSnapshot,
} from "firebase/firestore";
import Loading from "@/components/Loading";

interface Booking {
  userId: string;
  partnerId: string;
  listingId: string;
  amount: number;
  status: string;
  createdAt: any;
  updatedAt: any;
}

interface Stay {
  name: string;
  location: string;
  price: number;
  image?: string;
}

export default function BookingPage() {
  const params = useParams();
  const bookingId = typeof params?.id === "string" ? params.id : undefined;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [stay, setStay] = useState<Stay | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;

    const bookingRef: DocumentReference<DocumentData> = doc(db, "bookings", bookingId);

    // 🔹 Real-time listener for booking
    const unsub = onSnapshot(bookingRef, async (snap) => {
      if (!snap.exists()) {
        setBooking(null);
        setLoading(false);
        return;
      }

      const data = snap.data() as Omit<Booking, "id">; // Exclude id to avoid duplication
      const bookingData: Booking = { id: snap.id, ...data };
      setBooking(bookingData);

      // 🔹 Fetch stay info
      if (bookingData.listingId) {
        const stayRef: DocumentReference<DocumentData> = doc(db, "stays", bookingData.listingId);
        const staySnap = await getDoc(stayRef);
        if (staySnap.exists()) {
          const stayData = staySnap.data() as Omit<Stay, "id">;
          setStay({ id: staySnap.id, ...stayData });
        }
      }

      setLoading(false);
    });

    return () => unsub();
  }, [bookingId]);

  if (loading) return <Loading message="Loading booking details..." />;

  if (!booking)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Booking not found.
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold mb-4">Booking Details</h1>

      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <p>
          <span className="font-semibold">Booking ID:</span> {booking.id}
        </p>
        <p>
          <span className="font-semibold">Status:</span> {booking.status}
        </p>
        <p>
          <span className="font-semibold">Amount:</span> ₹{booking.amount}
        </p>
        <p>
          <span className="font-semibold">User ID:</span> {booking.userId}
        </p>
      </div>

      {stay && (
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-2xl font-semibold mb-2">{stay.name}</h2>
          <p className="text-gray-600 mb-2">{stay.location}</p>
          <p className="text-indigo-600 font-bold mb-2">₹{stay.price}/night</p>
          {stay.image && (
            <img
              src={stay.image}
              alt={stay.name}
              className="w-full h-64 object-cover rounded-2xl mt-2"
            />
          )}
        </div>
      )}
    </div>
  );
}
