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
import { motion } from "framer-motion";
import Link from "next/link";

// ---------------- TYPES ----------------
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
  image?: string;
  price: number;
}

// ---------------- COMPONENT ----------------
export default function BookingPage() {
  const { id: bookingId } = useParams(); // dynamic route param
  const [booking, setBooking] = useState<Booking | null>(null);
  const [stay, setStay] = useState<Stay | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;

    const bookingRef: DocumentReference<DocumentData> = doc(db, "bookings", bookingId);

    // 🔹 Real-time listener
    const unsub = onSnapshot(
      bookingRef,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Booking;
          const { id, ...rest } = data; // prevent duplicate id
          const bookingData = { id: snap.id, ...rest };
          setBooking(bookingData);

          // 🔹 Fetch stay details
          if (bookingData.listingId) {
            const stayRef = doc(db, "stays", bookingData.listingId);
            const staySnap = await getDoc(stayRef);
            if (staySnap.exists()) {
              setStay({ id: staySnap.id, ...(staySnap.data() as Stay) });
            }
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

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading booking details...
      </div>
    );

  if (!booking)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Booking not found.
      </div>
    );

  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-3xl font-bold mb-4">Booking Details</h1>

      <section className="bg-white rounded-2xl shadow-md p-6 mb-6">
        <h2 className="font-semibold text-xl mb-2">Booking Info</h2>
        <p>
          <span className="font-medium">Status:</span> {booking.status}
        </p>
        <p>
          <span className="font-medium">Amount:</span> ₹{booking.amount}
        </p>
        <p>
          <span className="font-medium">Booked On:</span>{" "}
          {booking.createdAt.toDate
            ? booking.createdAt.toDate().toLocaleString()
            : new Date(booking.createdAt).toLocaleString()}
        </p>
      </section>

      {stay ? (
        <section className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="font-semibold text-xl mb-4">Stay Details</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <img
              src={stay.image || "/placeholder.jpg"}
              alt={stay.name}
              className="h-48 w-full sm:w-64 object-cover rounded-2xl"
            />
            <div className="flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-lg">{stay.name}</h3>
                <p className="text-gray-500">{stay.location}</p>
              </div>
              <p className="text-indigo-600 font-bold text-lg mt-2">
                ₹{stay.price}/night
              </p>
            </div>
          </div>
        </section>
      ) : (
        <p className="text-gray-500">Stay information not available.</p>
      )}

      {/* Placeholder for Razorpay / Payment button */}
      {booking.status === "pending" && (
        <div className="mt-6 text-center">
          <button
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition"
            onClick={() => alert("Payment flow to be implemented")}
          >
            Pay Now
          </button>
        </div>
      )}

      <div className="mt-8">
        <Link href="/bookings" className="text-indigo-600 hover:underline">
          ← Back to all bookings
        </Link>
      </div>
    </motion.div>
  );
}
