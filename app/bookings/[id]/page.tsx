"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, DocumentData } from "firebase/firestore";
import Loading from "@/components/Loading";
import { createOrder } from "@/lib/payments-razorpay";

interface Booking {
  id: string;
  listingId?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  amount?: number;
  status?: string;
}

interface Stay {
  id: string;
  name: string;
  location?: string;
  image?: string;
}

export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [stay, setStay] = useState<Stay | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;

    const bookingRef = doc(db, "bookings", bookingId);
    const unsub = onSnapshot(bookingRef, async (snap) => {
      if (snap.exists()) {
        const bookingData = { id: snap.id, ...(snap.data() as Booking) };
        setBooking(bookingData);

        // 🔹 Fetch stay info safely
        if (bookingData.listingId) {
          const stayRef = doc(db, "stays", bookingData.listingId);
          const staySnap = await getDoc(stayRef);
          if (staySnap.exists())
            setStay({ id: staySnap.id, ...(staySnap.data() as Stay) });
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [bookingId]);

  if (loading) return <Loading message="Loading booking details..." />;

  if (!booking) return <p className="text-center text-gray-500 mt-10">Booking not found.</p>;

  const handlePayment = async () => {
    if (!booking || !stay || !booking.amount) return;

    try {
      const order = await createOrder({ amount: booking.amount });

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: order.amount,
        currency: order.currency,
        name: stay.name,
        description: `Booking ${booking.id}`,
        order_id: order.id,
        handler: function (response: any) {
          alert("Payment Successful! Payment ID: " + response.razorpay_payment_id);
        },
        prefill: {
          name: booking.userName || "",
          email: booking.userEmail || "",
          contact: booking.userPhone || "",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Payment error:", err);
      alert("Payment failed, try again.");
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <h1 className="text-3xl font-bold mb-4">{stay?.name || "Stay Booking"}</h1>
      <p className="text-gray-500 mb-2">Booking Status: {booking.status?.toUpperCase()}</p>
      <p className="text-gray-600 mb-4">Amount: ₹{booking.amount}</p>

      {stay && (
        <div className="bg-white rounded-2xl shadow-md p-4 mb-6">
          <img
            src={stay.image || "/placeholder.jpg"}
            alt={stay.name}
            className="h-60 w-full object-cover rounded-2xl"
          />
          <h2 className="font-semibold text-lg mt-2">{stay.name}</h2>
          <p className="text-gray-500">{stay.location}</p>
        </div>
      )}

      {booking.status === "pending" && (
        <button
          onClick={handlePayment}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
        >
          Pay Now
        </button>
      )}
    </div>
  );
}
