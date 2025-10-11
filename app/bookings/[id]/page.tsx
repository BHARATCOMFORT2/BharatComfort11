"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import Loading from "@/components/Loading";
import { createOrder } from "@/lib/payments-razorpay";

interface Booking {
  id: string;
  userId: string;
  partnerId?: string;
  listingId: string;
  amount: number;
  status: string;
  createdAt: any;
  updatedAt: any;
}

interface Stay {
  id: string;
  name: string;
  location: string;
  image?: string;
  price: number;
  description?: string;
}

export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = params?.id;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [stay, setStay] = useState<Stay | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!bookingId) return;

    const bookingRef = doc(db, "bookings", bookingId);

    // 🔹 Real-time listener for booking
    const unsub = onSnapshot(bookingRef, async (snap) => {
      if (snap.exists()) {
        const bookingData = snap.data() as Booking;
        setBooking(bookingData);

        // Fetch stay info
        const stayRef = doc(db, "stays", bookingData.listingId);
        const staySnap = await getDoc(stayRef);
        if (staySnap.exists()) {
          setStay({ id: staySnap.id, ...staySnap.data() } as Stay);
        }
        setLoading(false);
      }
    });

    return () => unsub();
  }, [bookingId]);

  // 🔹 Razorpay payment
  const handlePayment = async () => {
    if (!booking) return;
    setPaying(true);

    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ amount: booking.amount }),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || "Failed to create order");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: booking.amount * 100,
        currency: "INR",
        name: stay?.name || "BharatComfort Stay",
        order_id: data.id,
        handler: async (response: any) => {
          // TODO: verify payment server-side
          alert("Payment successful!");
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("Payment error:", err);
      alert(err.message);
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <Loading />;

  if (!booking) return <p className="text-center mt-10 text-gray-500">Booking not found.</p>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Booking Details</h1>

      <div className="bg-white p-6 rounded-2xl shadow-md space-y-4">
        <p>
          <span className="font-semibold">Booking ID:</span> {booking.id}
        </p>
        <p>
          <span className="font-semibold">Status:</span>{" "}
          <span
            className={`font-bold ${
              booking.status === "paid" ? "text-green-600" : "text-red-600"
            }`}
          >
            {booking.status.toUpperCase()}
          </span>
        </p>
        <p>
          <span className="font-semibold">Amount:</span> ₹{booking.amount}
        </p>
        <p>
          <span className="font-semibold">Booked On:</span>{" "}
          {booking.createdAt?.toDate
            ? booking.createdAt.toDate().toLocaleString()
            : new Date(booking.createdAt).toLocaleString()}
        </p>
      </div>

      {stay && (
        <div className="mt-6 bg-white rounded-2xl shadow-md overflow-hidden">
          <img
            src={stay.image || "/placeholder.jpg"}
            alt={stay.name}
            className="h-64 w-full object-cover"
          />
          <div className="p-4">
            <h2 className="text-2xl font-semibold">{stay.name}</h2>
            <p className="text-gray-500">{stay.location}</p>
            <p className="mt-2 font-bold text-indigo-600">₹{stay.price}/night</p>
            {stay.description && <p className="mt-2 text-gray-600">{stay.description}</p>}
          </div>
        </div>
      )}

      {booking.status !== "paid" && (
        <div className="mt-6 text-center">
          <button
            onClick={handlePayment}
            disabled={paying}
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition"
          >
            {paying ? "Processing..." : "Pay Now"}
          </button>
        </div>
      )}
    </div>
  );
}
