"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Loading from "@/components/Loading";

export default function BookingDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [booking, setBooking] = useState<any>(null);
  const [stay, setStay] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const bookingRef = doc(db, "bookings", id as string);
        const bookingSnap = await getDoc(bookingRef);

        if (!bookingSnap.exists()) {
          setError("Booking not found");
          return;
        }

        const bookingData = { id: bookingSnap.id, ...bookingSnap.data() };
        setBooking(bookingData);

        const stayRef = doc(db, "stays", bookingData.listingId);
        const staySnap = await getDoc(stayRef);
        if (staySnap.exists()) setStay({ id: staySnap.id, ...staySnap.data() });
      } catch (err: any) {
        setError(err.message || "Failed to fetch booking");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [id]);

  const handlePayment = async () => {
    if (!booking) return;
    setPaying(true);

    try {
      // 1️⃣ Call API to create Razorpay order
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: stay.price }), // price in INR
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to create order");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: data.order.currency,
        name: stay.name,
        description: `Booking ID: ${booking.id}`,
        order_id: data.order.id,
        handler: async (response: any) => {
          // 2️⃣ Payment successful: update booking status
          const bookingRef = doc(db, "bookings", booking.id);
          await updateDoc(bookingRef, { status: "paid", updatedAt: new Date() });
          setBooking({ ...booking, status: "paid" });
          alert("Payment successful!");
        },
        prefill: {
          name: booking.userName || "",
          email: booking.userEmail || "",
        },
        theme: { color: "#6366f1" },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <p className="text-red-500 text-center mt-10">{error}</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Booking Details</h1>

      {stay && (
        <div className="mb-6">
          <img
            src={stay.image || "/placeholder.jpg"}
            alt={stay.name}
            className="w-full h-96 object-cover rounded-2xl shadow-md mb-4"
          />
          <h2 className="text-2xl font-semibold">{stay.name}</h2>
          <p className="text-gray-600">{stay.location}</p>
          <p className="text-xl font-semibold mt-2">₹{stay.price}/night</p>
        </div>
      )}

      <div className="border-t pt-4 mt-4">
        <p>
          <span className="font-semibold">Booking ID:</span> {booking.id}
        </p>
        <p>
          <span className="font-semibold">Status:</span>{" "}
          <span
            className={
              booking.status === "paid"
                ? "text-green-600 font-bold"
                : "text-red-600 font-bold"
            }
          >
            {booking.status.toUpperCase()}
          </span>
        </p>
        <p>
          <span className="font-semibold">Booked On:</span>{" "}
          {booking.createdAt?.toDate
            ? booking.createdAt.toDate().toLocaleString()
            : new Date(booking.createdAt).toLocaleString()}
        </p>
      </div>

      {booking.status !== "paid" && (
        <div className="mt-6">
          <button
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
            onClick={handlePayment}
            disabled={paying}
          >
            {paying ? "Processing..." : "Pay Now"}
          </button>
        </div>
      )}
    </div>
  );
}
