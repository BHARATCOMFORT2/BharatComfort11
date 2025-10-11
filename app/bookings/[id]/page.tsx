"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createOrder, razorpay } from "@/lib/payments-razorpay";
import Loading from "@/components/Loading";

interface Booking {
  id: string;
  userId: string;
  partnerId: string;
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
  image: string;
  price: number;
}

export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [stay, setStay] = useState<Stay | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    if (!bookingId) return;

    const bookingRef = doc(db, "bookings", bookingId);

    const unsub = onSnapshot(bookingRef, async (snap) => {
      if (snap.exists()) {
        const bookingData = snap.data() as Booking;
        setBooking({ id: snap.id, ...bookingData });

        // Fetch related stay
        const stayRef = doc(db, "stays", bookingData.listingId);
        const staySnap = await getDoc(stayRef);
        if (staySnap.exists())
          setStay({ id: staySnap.id, ...(staySnap.data() as Stay) });

        setLoading(false);
      }
    });

    return () => unsub();
  }, [bookingId]);

  const handlePayment = async () => {
    if (!booking) return;
    setPaymentLoading(true);

    try {
      // Create order on server
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: booking.amount }),
      });
      const orderData = await orderRes.json();

      if (!orderData.success) throw new Error(orderData.error);

      // Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: stay?.name || "Booking",
        description: "Stay booking payment",
        order_id: orderData.order.id,
        handler: async function (response: any) {
          // Optional: Verify payment on server
          alert("Payment successful! Payment ID: " + response.razorpay_payment_id);
        },
        prefill: {
          name: "Guest",
          email: "guest@example.com",
        },
        theme: {
          color: "#4f46e5",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert("Payment failed: " + err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) return <Loading message="Loading booking details..." />;

  if (!booking) return <p className="text-center mt-10">Booking not found.</p>;

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <h1 className="text-3xl font-bold mb-4 text-center">Booking Details</h1>

      {stay && (
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-md overflow-hidden mb-6">
          <img src={stay.image || "/placeholder.jpg"} className="w-full h-64 object-cover" />
          <div className="p-4">
            <h2 className="font-semibold text-2xl">{stay.name}</h2>
            <p className="text-gray-500">{stay.location}</p>
            <p className="text-indigo-600 font-bold mt-2">₹{stay.price}/night</p>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto bg-white p-4 rounded-2xl shadow-md">
        <p>
          <strong>Booking ID:</strong> {booking.id}
        </p>
        <p>
          <strong>Status:</strong> {booking.status}
        </p>
        <p>
          <strong>Amount:</strong> ₹{booking.amount}
        </p>
        <p>
          <strong>Created At:</strong>{" "}
          {new Date(booking.createdAt?.seconds * 1000).toLocaleString()}
        </p>

        <button
          onClick={handlePayment}
          disabled={paymentLoading || booking.status === "paid"}
          className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          {booking.status === "paid" ? "Paid" : paymentLoading ? "Processing..." : "Pay Now"}
        </button>
      </div>
    </div>
  );
}
