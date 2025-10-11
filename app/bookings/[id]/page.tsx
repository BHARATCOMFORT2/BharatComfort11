"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { motion } from "framer-motion";
import Loading from "@/components/Loading";

export default function BookingPage() {
  const { id: bookingId } = useParams();

  const [booking, setBooking] = useState<any>(null);
  const [stay, setStay] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;

    const bookingRef = doc(db, "bookings", bookingId);

    // 🔹 Real-time listener for booking
    const unsub = onSnapshot(
      bookingRef,
      async (snap) => {
        if (!snap.exists()) {
          setError("Booking not found");
          setLoading(false);
          return;
        }

        const bookingData = { id: snap.id, ...snap.data() };
        setBooking(bookingData);

        // 🔹 Fetch associated stay
        if (bookingData.listingId) {
          const stayRef = doc(db, "stays", bookingData.listingId);
          const staySnap = await getDoc(stayRef);
          if (staySnap.exists()) setStay({ id: staySnap.id, ...staySnap.data() });
        }

        setLoading(false);
      },
      (err) => {
        console.error("Error fetching booking:", err);
        setError("Failed to fetch booking");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [bookingId]);

  if (loading) return <Loading />;
  if (error) return <p className="text-red-500 text-center mt-8">{error}</p>;
  if (!booking) return <p className="text-gray-500 text-center mt-8">No booking data found.</p>;

  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md overflow-hidden p-6">
        <h1 className="text-3xl font-bold mb-4">Booking Details</h1>

        {stay && (
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">{stay.title}</h2>
            <p className="text-gray-600">{stay.location}</p>
            <p className="text-indigo-600 font-bold mt-1">₹{stay.price}/night</p>
          </div>
        )}

        <div className="mb-4">
          <p>
            <span className="font-semibold">Booking ID:</span> {booking.id}
          </p>
          <p>
            <span className="font-semibold">Status:</span>{" "}
            <span
              className={`font-bold ${
                booking.status === "confirmed"
                  ? "text-green-600"
                  : booking.status === "pending"
                  ? "text-yellow-600"
                  : "text-red-600"
              }`}
            >
              {booking.status.toUpperCase()}
            </span>
          </p>
          <p>
            <span className="font-semibold">Amount:</span> ₹{booking.amount}
          </p>
          {booking.paymentId && (
            <p>
              <span className="font-semibold">Payment ID:</span> {booking.paymentId}
            </p>
          )}
          {booking.partnerId && (
            <p>
              <span className="font-semibold">Partner ID:</span> {booking.partnerId}
            </p>
          )}
          {booking.userId && (
            <p>
              <span className="font-semibold">User ID:</span> {booking.userId}
            </p>
          )}
          <p>
            <span className="font-semibold">Created At:</span>{" "}
            {booking.createdAt?.toDate
              ? booking.createdAt.toDate().toLocaleString()
              : new Date(booking.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
