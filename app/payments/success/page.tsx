"use client";

import { motion } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId"); // Passed from checkout redirect
  const [paymentData, setPaymentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;

    // ✅ Real-time Firestore listener for payment/booking document
    const ref = doc(db, "bookings", bookingId);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setPaymentData(snap.data());
        } else {
          setPaymentData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error listening to booking:", err);
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
  if (!paymentData)
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
          Your booking has been confirmed for{" "}
          <span className="font-semibold">{paymentData.listingId}</span>.
        </p>

        <div className="bg-gray-50 p-4 rounded-xl text-left mb-6 space-y-1">
          <p>
            <strong>Status:</strong>{" "}
            <span className="text-green-600">{paymentData.status}</span>
          </p>
          <p>
            <strong>Amount:</strong> ₹{paymentData.totalPrice}
          </p>
          <p>
            <strong>Check-in:</strong> {paymentData.checkIn}
          </p>
          <p>
            <strong>Check-out:</strong> {paymentData.checkOut}
          </p>
          <p>
            <strong>Guests:</strong> {paymentData.guests}
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
