"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";

export default function StayDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [stay, setStay] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  // ✅ Fetch stay details
  useEffect(() => {
    async function fetchStay() {
      try {
        const docRef = doc(db, "stays", id as string);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setStay({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.error("Error fetching stay:", error);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchStay();
  }, [id]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading stay details...
      </div>
    );

  if (!stay)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-600">
        <p>Stay not found.</p>
        <button
          onClick={() => router.push("/stays")}
          className="mt-4 bg-indigo-600 text-white px-5 py-2 rounded-full"
        >
          Go Back
        </button>
      </div>
    );

  // ✅ Booking handler
  async function handleBooking() {
    try {
      setBooking(true);
      const user = auth.currentUser;
      if (!user) {
        alert("Please log in to book a stay.");
        router.push("/login");
        return;
      }

      // Create booking order
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          stayId: stay.id,
          stayName: stay.name,
          amount: stay.price * 100, // in paise
        }),
      });

      const data = await res.json();
      if (!data.order) throw new Error("Order creation failed.");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: "INR",
        name: "BharatComfort11",
        description: `Booking for ${stay.name}`,
        order_id: data.order.id,
        handler: async function (response: any) {
          // ✅ Redirect to booking success page
          window.location.href = `/bookings/success?id=${data.bookingId}`;
        },
        prefill: {
          name: user.displayName || "Guest",
          email: user.email || "",
        },
        theme: { color: "#4f46e5" },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Booking error:", error);
      alert("Booking failed. Please try again.");
    } finally {
      setBooking(false);
    }
  }

  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md overflow-hidden">
        {/* Stay Image */}
        <img
          src={stay.image || "/placeholder.jpg"}
          alt={stay.name}
          className="h-80 w-full object-cover"
        />

        {/* Stay Info */}
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-2">{stay.name}</h1>
          <p className="text-gray-600 mb-4">{stay.location}</p>
          <p className="text-gray-700 mb-6 leading-relaxed">
            {stay.description || "A perfect stay for your next journey!"}
          </p>

          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <p className="text-indigo-600 font-bold text-xl">
                ₹{stay.price}/night
              </p>
              <p className="text-sm text-gray-500">Includes all taxes</p>
            </div>

            <button
              disabled={booking}
              onClick={handleBooking}
              className={`${
                booking ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
              } text-white px-6 py-3 rounded-full transition`}
            >
              {booking ? "Processing..." : "Book Now"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
