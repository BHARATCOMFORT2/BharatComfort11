"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, DocumentData, DocumentReference } from "firebase/firestore";
import Loading from "@/components/Loading";
import Link from "next/link";

interface Booking {
  id: string;
  userId: string;
  partnerId?: string;
  listingId?: string;
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

    const bookingRef: DocumentReference<DocumentData> = doc(db, "bookings", bookingId);

    const unsub = onSnapshot(bookingRef, async (snap) => {
      if (snap.exists()) {
        const bookingData = snap.data() as Booking;
        bookingData.id = snap.id; // ensure id is set
        setBooking(bookingData);

        // Fetch stay info if listingId exists
        if (bookingData.listingId) {
          const stayRef: DocumentReference<DocumentData> = doc(db, "stays", bookingData.listingId);
          const staySnap = await getDoc(stayRef);
          if (staySnap.exists()) setStay({ id: staySnap.id, ...(staySnap.data() as Stay) });
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [bookingId]);

  if (loading) return <Loading message="Loading booking details..." />;

  if (!booking)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-600">
        <p>Booking not found.</p>
        <Link href="/bookings" className="text-indigo-600 mt-4 hover:underline">
          Back to Bookings
        </Link>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold mb-4">Booking Details</h1>

      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
        <p>
          <span className="font-semibold">Booking ID:</span> {booking.id}
        </p>
        <p>
          <span className="font-semibold">Amount:</span> ₹{booking.amount}
        </p>
        <p>
          <span className="font-semibold">Status:</span>{" "}
          <span
            className={`font-bold ${
              booking.status === "pending"
                ? "text-yellow-600"
                : booking.status === "confirmed"
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {booking.status}
          </span>
        </p>
        <p>
          <span className="font-semibold">Created At:</span>{" "}
          {booking.createdAt?.toDate ? booking.createdAt.toDate().toLocaleString() : "N/A"}
        </p>
      </div>

      {stay ? (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <img
            src={stay.image || "/placeholder.jpg"}
            alt={stay.name}
            className="h-64 w-full object-cover"
          />
          <div className="p-4">
            <h2 className="text-xl font-semibold">{stay.name}</h2>
            <p className="text-gray-500">{stay.location}</p>
            <p className="text-indigo-600 font-bold mt-2">₹{stay.price}/night</p>
            <Link
              href={`/stays/${stay.id}`}
              className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              View Stay
            </Link>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 mt-4">Stay details not available.</p>
      )}
    </div>
  );
}
