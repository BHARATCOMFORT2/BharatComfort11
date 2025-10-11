"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { openRazorpayCheckout } from "@/lib/razorpay-client";

export default function StayDetailPage() {
  const { id } = useParams(); // stay ID from URL
  const router = useRouter();

  const [stay, setStay] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  // 🔹 Fetch stay details
  useEffect(() => {
    if (!id) return;
    const fetchStay = async () => {
      try {
        const docRef = doc(db, "stays", id as string);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setStay({ id: snap.id, ...snap.data() });
        } else {
          console.error("Stay not found");
        }
      } catch (err) {
        console.error("Error loading stay:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStay();
  }, [id]);

  // 🔹 Handle booking
  const handleBooking = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please log in to book your stay.");
      router.push("/login");
      return;
    }

    if (!stay) return;

    setBookingLoading(true);

    try {
      // ✅ Create booking
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          partnerId: stay.partnerId || "unknown-partner",
          listingId: stay.id,
          amount: stay.price || 2000,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // ✅ Open Razorpay Checkout
      openRazorpayCheckout(data.order, data.id);
    } catch (err: any) {
      console.error(err);
      alert("Booking failed: " + err.message);
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
      className="min-h-screen bg-gray-50 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Stay Hero Image */}
      <div className="rounded-2xl overflow-hidden shadow-lg mb-8">
        <img
          src={stay.image || "/placeholder.jpg"}
          alt={stay.name}
          className="w-full h-80 object-cover"
        />
      </div>

      {/* Stay Info */}
      <div className="max-w-4xl mx-auto bg-white shadow rounded-2xl p-6">
        <h1 className="text-3xl font-bold mb-2">{stay.name}</h1>
        <p className="text-gray-600 mb-4">{stay.location}</p>

        <p className="text-gray-700 leading-relaxed mb-6">
          {stay.description || "No description available for this stay."}
        </p>

        <div className="flex items-center justify-between mb-6">
          <p className="text-xl font-semibold text-indigo-600">
            ₹{stay.price || 2000} / night
          </p>

          <button
            onClick={handleBooking}
            disabled={bookingLoading}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {bookingLoading ? "Processing..." : "Book Now"}
          </button>
        </div>

        {/* Extra info */}
        <div className="border-t pt-4 text-sm text-gray-500">
          <p>Hosted by: {stay.hostName || "Verified Partner"}</p>
          <p>Type: {stay.type || "Guesthouse"}</p>
          <p>Guests allowed: {stay.guests || "N/A"}</p>
        </div>
      </div>
    </motion.div>
  );
}
