"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { motion } from "framer-motion";

// Interfaces
interface Stay {
  id: string;
  name: string;
  location: string;
  price: number;
  image?: string;
  partnerId?: string;
}

export default function StaysPage() {
  const [stays, setStays] = useState<Stay[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking state
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "stays"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Stay[];
      setStays(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleBookNow = async (stay: Stay) => {
    if (!checkIn || !checkOut) {
      alert("Please select check-in and check-out dates.");
      return;
    }
    setPaymentLoading(true);

    try {
      // 1️⃣ Create Razorpay order on server
      const orderRes = await fetch("/api/payments/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: stay.price }),
      });
      const { order } = await orderRes.json();
      if (!order?.id) throw new Error("Failed to create order.");

      // 2️⃣ Open Razorpay Checkout
      const rzp = new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: order.amount,
        currency: "INR",
        name: "BharatComfort11",
        description: `Booking for ${stay.name}`,
        order_id: order.id,
        handler: async function (response: any) {
          // 3️⃣ Verify payment & create booking
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              listingId: stay.id,
              checkIn,
              checkOut,
              guests,
              totalPrice: stay.price,
              userId: "LOGGED_IN_USER_ID", // replace with auth user UID
            }),
          });

          const data = await verifyRes.json();
          if (data.success) alert("✅ Booking confirmed!");
          else alert("❌ Payment verification failed.");
        },
        prefill: {
          name: "Guest User",
          email: "guest@example.com",
          contact: "9999999999",
        },
        theme: { color: "#4f46e5" },
      });

      rzp.open();
    } catch (err: any) {
      console.error("Booking error:", err);
      alert("❌ Payment failed: " + err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading stays...
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-3xl font-bold mb-6 text-center">Available Stays</h1>

      {/* Booking Inputs */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
        <input
          type="date"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          className="border rounded-lg p-2"
        />
        <input
          type="date"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          className="border rounded-lg p-2"
        />
        <input
          type="number"
          min={1}
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="border rounded-lg p-2 w-24"
        />
      </div>

      {stays.length === 0 ? (
        <p className="text-center text-gray-500">No stays available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stays.map((stay) => (
            <motion.div
              key={stay.id}
              className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-shadow"
              whileHover={{ scale: 1.03 }}
            >
              <img
                src={stay.image || "/placeholder.jpg"}
                alt={stay.name}
                className="h-48 w-full object-cover"
              />
              <div className="p-4">
                <h2 className="font-semibold text-lg">{stay.name}</h2>
                <p className="text-sm text-gray-500">{stay.location}</p>
                <p className="text-indigo-600 font-bold mt-2">
                  ₹{stay.price}/night
                </p>
                <button
                  onClick={() => handleBookNow(stay)}
                  disabled={paymentLoading}
                  className="mt-3 w-full bg-indigo-600 text-white py-2 rounded-xl hover:bg-indigo-700 transition"
                >
                  {paymentLoading ? "Processing..." : "Book Now"}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
