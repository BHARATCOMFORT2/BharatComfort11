"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
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
        if (docSnap.exists()) setStay({ id: docSnap.id, ...docSnap.data() });
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
      // 1️⃣ Create Razorpay order via server
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ amount: stay.price }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const orderId = data.id;

      // 2️⃣ Open Razorpay Checkout
      openRazorpayCheckout({
        amount: stay.price,
        orderId,
        name: user.displayName || "Guest",
        email: user.email!,
        phone: user.phoneNumber || "",
        onSuccess: async (response) => {
          // 3️⃣ Payment success → create booking in Firestore
          try {
            await addDoc(collection(db, "bookings"), {
              userId: user.uid,
              partnerId: stay.partnerId,
              listingId: stay.id,
              amount: stay.price,
              status: "paid",
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            alert("Booking successful!");
          } catch (err) {
            console.error("Error creating booking:", err);
            alert("Booking created but failed to save in database.");
          }
        },
        onFailure: (err) => {
          console.log("Payment failed or cancelled:", err);
          alert("Payment failed or cancelled.");
        },
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
      <div className="rounded-2xl overflow-hidden shadow-md mb-6">
        <img
          src={stay.image || "/placeholder.jpg"}
          alt={stay.name}
          className="w-full h-64 object-cover"
        />
      </div>

      <h1 className="text-3xl font-bold text-yellow-900 mb-2">{stay.name}</h1>
      <p className="text-gray-600 mb-2">{stay.location}</p>
      <p className="text-indigo-600 font-bold mb-4 text-lg">₹{stay.price}/night</p>
      <p className="text-gray-700 mb-6">{stay.description}</p>

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
