"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Loading from "@/components/Loading";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getAuth } from "firebase/auth";
import { onSnapshot } from "firebase/firestore";

interface Stay {
  id: string;
  name: string;
  price: number;
  partnerId?: string;
  location?: string;
  image?: string;
}

export default function StayPage() {
  const params = useParams();
  const router = useRouter();
  const stayId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [stay, setStay] = useState<Stay | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Date picker state
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);

  useEffect(() => {
    if (!stayId) return;

    const fetchStay = async () => {
      try {
        setLoading(true);
     
const docRef = doc(db, "stays", stayId);
const unsubscribe = onSnapshot(docRef, (docSnap) => {
  if (docSnap.exists()) {
    setStay({ id: docSnap.id, ...(docSnap.data() as any) });
  } else {
    setStay(null);
  }
});

return () => unsubscribe(); // Cleanup listener on unmount


      } catch (err) {
        console.error("Error fetching stay:", err);
        setStay(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStay();
  }, [stayId]);

  const getNights = () => {
  if (!checkIn || !checkOut) return 0;
  const diffTime = checkOut.getTime() - checkIn.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const totalPrice = stay ? stay.price * guests * getNights() : 0;


  const handleBooking = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      alert("Please log in to continue with booking.");
      router.push(`/login?redirect=/stays/${stayId}`);
      return;
    }

    if (!stay || !checkIn || !checkOut) {
      alert("Please select check-in and check-out dates");
      return;
    }

    if (checkOut <= checkIn) {
      alert("Check-out must be after check-in");
      return;
    }

    setPaymentLoading(true);

    try {
      // 1) Create booking + Razorpay order on server
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          partnerId: stay.partnerId || null,
          listingId: stay.id,
          amount: totalAmount,
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to create booking/order: ${text}`);
      }

      const data = await res.json();
      // Expect server to return { success: true, id: '<razorpay_order_id>', bookingId: '<bookingDocId>' }
      if (!data || !data.id) throw new Error(data?.error || "Invalid server response");

      // 2) Razorpay checkout
      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        throw new Error("Razorpay SDK not loaded. Make sure script is included in _document or page.");
      }

      const rzp = new Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY as string,
        amount: totalAmount * 100, // paise
        currency: "INR",
        name: stay.name,
        description: `${nights} night(s)` ,
        order_id: data.id,
        handler: async function (response: any) {
          // payment successful — confirm on backend
          try {
            const confirmRes = await fetch("/api/bookings/confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bookingId: data.bookingId || null,
                orderId: data.id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                userId: user.uid,
                status: "confirmed",
              }),
            });

            if (!confirmRes.ok) {
              const txt = await confirmRes.text();
              console.error("Confirm API error:", txt);
              alert("Payment succeeded but confirming booking failed. Contact support.");
              return;
            }

            const confirmData = await confirmRes.json();
            // You can route user to bookings page or booking details
            alert("Payment successful! Booking confirmed.");
            router.push(`/bookings/${confirmData.bookingId || data.bookingId}`);
          } catch (err) {
            console.error("Error confirming booking:", err);
            alert("Payment succeeded but confirming booking failed. Contact support.");
          }
        },
        prefill: {
          name: user.displayName || undefined,
          email: user.email || undefined,
        },
        theme: { color: "#4F46E5" },
      });

      rzp.open();
    } catch (err: any) {
      console.error(err);
      alert("Payment failed: " + (err.message || err));
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) return <Loading message="Loading stay..." />;
  if (!stay) return <div className="text-center mt-10 text-gray-500">Stay not found.</div>;

  return (
    <div className="min-h-screen p-6 bg-gray-50 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{stay.name}</h1>
      <p className="text-gray-600 mb-4">{stay.location}</p>
      <p className="text-indigo-600 font-bold mb-6">₹{stay.price}/night</p>

      <img src={stay.image || "/placeholder.jpg"} alt={stay.name} className="rounded-2xl w-full max-h-[400px] object-cover mb-6 shadow-md" />

      {/* Date Pickers */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <label className="block mb-1 font-medium">Check-in</label>
          <DatePicker
            selected={checkIn}
            onChange={(date: Date | null) => setCheckIn(date)}
            selectsStart
            startDate={checkIn}
            endDate={checkOut}
            minDate={new Date()}
            className="w-full border rounded-lg p-2"
            placeholderText="Select check-in"
          />
        </div>
        <div className="flex-1">
          <label className="block mb-1 font-medium">Check-out</label>
          <DatePicker
            selected={checkOut}
            onChange={(date: Date | null) => setCheckOut(date)}
            selectsEnd
            startDate={checkIn}
            endDate={checkOut}
            minDate={checkIn || new Date()}
            className="w-full border rounded-lg p-2"
            placeholderText="Select check-out"
          />
        </div>
      </div>
<div className="flex flex-col gap-2 mb-6">
  <label className="block font-medium">Guests</label>
  <input
    type="number"
    min={1}
    max={10}
    value={guests}
    onChange={(e) => setGuests(parseInt(e.target.value))}
    className="w-24 border rounded-lg p-2"
  />
</div>
      {/* Price summary */}
      <div className="mb-6 p-4 rounded-lg bg-white shadow-sm border">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">Price per night</div>
          <div className="font-medium">₹{stay.price}</div>
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">Nights</div>
          <div className="font-medium">{nights || 0}</div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Total</div>
          <div className="font-bold text-indigo-600">₹{totalAmount}</div>
        </div>
      </div>

      <button
        onClick={handleBooking}
        disabled={paymentLoading || !checkIn || !checkOut}
        className={`px-6 py-3 text-white font-semibold rounded-lg transition ${paymentLoading || !checkIn || !checkOut ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
      >
        {paymentLoading ? "Processing..." : "Book Now"}
      </button>
    </div>
  );
}
