"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { createOrder, openRazorpayCheckout } from "@/lib/payments-razorpay";
import { getAuth } from "firebase/auth";

export default function StayDetailsPage() {
  const params = useParams();
  const stayId = params?.id;
  const [stay, setStay] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;

  // Fetch stay details
  useEffect(() => {
    if (!stayId) return;

    const fetchStay = async () => {
      try {
        const docRef = doc(db, "stays", stayId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setStay({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        console.error("Error fetching stay:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStay();
  }, [stayId]);

  // Handle booking
  const handleBooking = async () => {
    if (!user) return alert("Please login to book this stay.");

    setBookingLoading(true);

    try {
      // 1️⃣ Create Razorpay order (server-side)
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ amount: stay.price }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // 2️⃣ Open Razorpay checkout
      openRazorpayCheckout({
        amount: stay.price,
        orderId: data.id,
        name: user.displayName || "Guest",
        email: user.email!,
        phone: user.phoneNumber || "",
      });

      // Optionally: create booking in Firebase with "pending" status
      await fetch("/api/bookings/create", {
        method: "POST",
        body: JSON.stringify({
          userId: user.uid,
          partnerId: stay.partnerId,
          listingId: stay.id,
          amount: stay.price,
        }),
      });

    } catch (err: any) {
      console.error("Booking error:", err);
      alert(err.message || "Booking failed.");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading stay details...
      </div>
    );

  if (!stay)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Stay not found.
      </div>
    );

  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6 max-w-4xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Stay Images */}
      <div className="rounded-2xl overflow-hidden shadow-md mb-6">
        <img
          src={stay.image || "/placeholder.jpg"}
          alt={stay.name}
          className="w-full h-64 object-cover"
        />
      </div>

      {/* Stay Info */}
      <h1 className="text-3xl font-bold text-yellow-900 mb-2">{stay.name}</h1>
      <p className="text-gray-600 mb-2">{stay.location}</p>
      <p className="text-indigo-600 font-bold mb-4 text-lg">
        ₹{stay.price}/night
      </p>
      <p className="text-gray-700 mb-6">{stay.description}</p>

      {/* Book Now Button */}
      <button
        onClick={handleBooking}
        disabled={bookingLoading}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {bookingLoading ? "Processing..." : "Book Now"}
      </button>
    </motion.div>
  );
}
