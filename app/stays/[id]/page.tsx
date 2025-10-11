"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Loading from "@/app/components/Loading";

export default function StayPage() {
  const params = useParams();
  const stayId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [stay, setStay] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    if (!stayId) return;

    const fetchStay = async () => {
      try {
        const docRef = doc(db, "stays", stayId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setStay({ id: docSnap.id, ...docSnap.data() });
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
    setPaymentLoading(true);

    try {
      // 1️⃣ Create booking/order on server
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "demoUserId",
          partnerId: stay.partnerId,
          listingId: stay.id,
          amount: stay.price,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // 2️⃣ Razorpay checkout
      const rzp = new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
        amount: stay.price * 100,
        currency: "INR",
        name: stay.name,
        order_id: data.id,
        handler: function (response: any) {
          alert("Payment successful! Payment ID: " + response.razorpay_payment_id);
        },
        theme: { color: "#4F46E5" },
      });
      rzp.open();
    } catch (err: any) {
      console.error(err);
      alert("Payment failed: " + err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) return <Loading message="Loading stay..." />;
  if (!stay) return <div className="text-center mt-10 text-gray-500">Stay not found.</div>;

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <h1 className="text-3xl font-bold mb-2">{stay.name}</h1>
      <p className="text-gray-600 mb-4">{stay.location}</p>
      <p className="text-indigo-600 font-bold mb-6">₹{stay.price}/night</p>

      <img src={stay.image || "/placeholder.jpg"} alt={stay.name} className="rounded-2xl w-full max-h-[400px] object-cover mb-6 shadow-md" />

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
