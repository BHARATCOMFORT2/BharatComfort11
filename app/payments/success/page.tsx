"use client";

import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

// ✅ Content component using useSearchParams()
function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Real-time Firestore listener for booking confirmation
  useEffect(() => {
    if (!bookingId) return;

    const ref = doc(db, "bookings", bookingId);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setBooking(snap.data());
        } else {
          setBooking(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to booking:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [bookingId]);

  // 🔄 Loading state
  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-gray-600 mt-3">Verifying your payment...</p>
      </div>
    );

  // ❌ Not found
  if (!booking)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <p className="text-red-600 font-medium">
          ❌ Booking not found or not verified.
        </p>
        <Link href="/listings">
          <Button className="mt-4">Back to Listings</Button>
        </Link>
      </div>
    );

  // ✅ Payment confirmed
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <motion.div
        className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="flex justify-center mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <CheckCircle className="w-20 h-20 text-green-500" />
        </motion.div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful 🎉
        </h1>
        <p className="text-gray-600 mb-6">
          Your booking for{" "}
          <span className="font-semibold">{booking.listingId}</span> has been
          confirmed.
        </p>

        <div className="bg-gray-50 p-4 rounded-xl text-left mb-6 space-y-1">
          <p>
            <strong>Status:</strong>{" "}
            <span className="text-green-600 font-semibold">
              {booking.status || "confirmed"}
            </span>
          </p>
          <p>
            <strong>Amount:</strong> ₹{booking.totalPrice}
          </p>
          <p>
            <strong>Check-in:</strong> {booking.checkIn}
          </p>
          <p>
            <strong>Check-out:</strong> {booking.checkOut}
          </p>
          <p>
            <strong>Guests:</strong> {booking.guests}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/partner/listings">
            <Button className="w-full sm:w-auto">Go to Listings</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="w-full sm:w-auto">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

// ✅ Wrap the content in Suspense (Next.js 14 requirement)
export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
