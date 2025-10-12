"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Loading from "@/components/Loading";

interface Stay {
  id: string;
  name: string;
  location: string;
  price: number;
  image?: string;
  partnerId?: string;
}

export default function StayPage() {
  const params = useParams();
  const stayId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [stay, setStay] = useState<Stay | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Booking state
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);

  useEffect(() => {
    if (!stayId) return;

    const fetchStay = async () => {
      try {
        const docRef = doc(db, "stays", stayId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setStay({ id: docSnap.id, ...docSnap.data() } as Stay);
        }
      } catch (err) {
        console.error("Error fetching stay:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStay();
  }, [stayId]);

  const handleBooking = async () => {
    if (!stay) return;
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

  if (loading) return <Loading message="Loading stay..." />;
  if (!stay)
    return (
      <div className="text-center mt-10 text-gray-500">Stay not found.</div>
    );

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <h1 className="text-3xl font-bold mb-2">{stay.name}</h1>
      <p className="text-gray-600 mb-4">{stay.location}</p>
      <p className="text-indigo-600 font-bold mb-6">₹{stay.price}/night</p>

      <img
        src={stay.image || "/placeholder.jpg"}
        alt={stay.name}
        className="rounded-2xl w-full max-h-[400px] object-cover mb-6 shadow-md"
      />

      {/* Booking Form */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
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

      <button
        onClick={handleBooking}
        disabled={paymentLoading}
        className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
      >
        {paymentLoading ? "Processing..." : "Book Now"}
      </button>
    </div>
  );
}
