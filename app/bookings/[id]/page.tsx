"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  onSnapshot,
  DocumentReference,
  DocumentData,
} from "firebase/firestore";
import Loading from "@/app/components/Loading";

interface Booking {
  id?: string;
  userId: string;
  partnerId?: string;
  listingId: string;
  amount: number;
  status: string;
  createdAt?: any;
  updatedAt?: any;
}

interface Stay {
  id?: string;
  name: string;
  location: string;
  image?: string;
  price: number;
}

export default function BookingDetailsPage() {
  const { id: bookingIdParam } = useParams();
  const bookingId = Array.isArray(bookingIdParam) ? bookingIdParam[0] : bookingIdParam;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [stay, setStay] = useState<Stay | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;

    const bookingRef: DocumentReference<DocumentData> = doc(db, "bookings", bookingId);

    // 🔹 Real-time listener for booking
    const unsub = onSnapshot(
      bookingRef,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Booking;
          const { id, ...rest } = data;
          const bookingData = { id: snap.id, ...rest };
          setBooking(bookingData);

          // 🔹 Fetch stay info if listingId exists
          if (bookingData.listingId) {
            const stayRef = doc(db, "stays", bookingData.listingId);
            const staySnap = await getDoc(stayRef);
            if (staySnap.exists()) setStay({ id: staySnap.id, ...staySnap.data() } as Stay);
          }
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching booking:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [bookingId]);

  if (loading) return <Loading text="Loading booking details..." />;

  if (!booking)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Booking not found.
      </div>
    );

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <h1 className="text-3xl font-bold mb-4 text-center">Booking Details</h1>

      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-md p-6 space-y-4">
        <div className="flex justify-between">
          <span className="font-semibold">Booking ID:</span>
          <span>{booking.id}</span>
        </div>

        <div className="flex justify-between">
          <span className="font-semibold">Status:</span>
          <span
            className={`font-semibold ${
              booking.status === "pending"
                ? "text-yellow-600"
                : booking.status === "confirmed"
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {booking.status}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="font-semibold">Amount:</span>
          <span>₹{booking.amount}</span>
        </div>

        {stay && (
          <div className="mt-4 border-t pt-4">
            <h2 className="text-2xl font-semibold mb-2">Stay Details</h2>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <img
                src={stay.image || "/placeholder.jpg"}
                alt={stay.name}
                className="h-40 w-60 rounded-xl object-cover shadow"
              />
              <div>
                <h3 className="text-xl font-semibold">{stay.name}</h3>
                <p className="text-gray-600">{stay.location}</p>
                <p className="text-indigo-600 font-bold mt-1">₹{stay.price}/night</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 border-t pt-4">
          <p className="text-gray-500 text-sm">
            Created at: {booking.createdAt?.toDate?.().toLocaleString() || "N/A"}
          </p>
          <p className="text-gray-500 text-sm">
            Last updated: {booking.updatedAt?.toDate?.().toLocaleString() || "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}
