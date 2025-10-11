"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  onSnapshot,
  DocumentData,
  DocumentReference,
} from "firebase/firestore";
import Loading from "@/components/Loading";

// ✅ Interfaces with `id`
interface Booking {
  id: string;
  userId: string;
  partnerId: string;
  listingId: string;
  amount: number;
  status: string;
  createdAt: any;
  updatedAt: any;
}

interface Stay {
  id: string;
  name: string;
  location: string;
  price: number;
  image?: string;
}

export default function BookingPage() {
  const params = useParams();
  const bookingId = params?.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [stay, setStay] = useState<Stay | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;

    // 🔹 Reference to booking document
    const bookingRef: DocumentReference<DocumentData> = doc(db, "bookings", bookingId);

    // 🔹 Real-time listener
    const unsub = onSnapshot(bookingRef, async (snap) => {
      if (snap.exists()) {
        // Exclude id from Firestore data to avoid duplication
        const data = snap.data() as Omit<Booking, "id">;
        const bookingData: Booking = { id: snap.id, ...data };
        setBooking(bookingData);

        // 🔹 Fetch stay info
        if (bookingData.listingId) {
          const stayRef: DocumentReference<DocumentData> = doc(db, "stays", bookingData.listingId);
          const staySnap = await getDoc(stayRef);
          if (staySnap.exists()) {
            const stayData: Stay = { id: staySnap.id, ...(staySnap.data() as Omit<Stay, "id">) };
            setStay(stayData);
          }
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [bookingId]);

  if (loading) return <Loading message="Loading booking details..." />;

  if (!booking)
    return <p className="text-center text-gray-500">Booking not found.</p>;

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <h1 className="text-3xl font-bold mb-4 text-center">Booking Details</h1>

      <div className="max-w-3xl mx-auto bg-white shadow-md rounded-2xl p-6">
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
          <span className="font-semibold">Created At:</span>{" "}
          {booking.createdAt?.toDate?.().toLocaleString() ||
            new Date(booking.createdAt).toLocaleString()}
        </p>

        {stay && (
          <div className="mt-6 border-t pt-4">
            <h2 className="text-2xl font-semibold mb-2">Stay Details</h2>
            <div className="flex gap-4 items-center">
              {stay.image && (
                <img
                  src={stay.image}
                  alt={stay.name}
                  className="w-32 h-32 object-cover rounded-xl shadow"
                />
              )}
              <div>
                <p className="font-semibold text-lg">{stay.name}</p>
                <p className="text-gray-600">{stay.location}</p>
                <p className="text-indigo-600 font-bold mt-1">₹{stay.price}/night</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
