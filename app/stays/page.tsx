"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { motion } from "framer-motion";
import { getAuth } from "firebase/auth";

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
  const [filteredStays, setFilteredStays] = useState<Stay[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking state
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [paymentLoadingMap, setPaymentLoadingMap] = useState<Record<string, boolean>>({});

  // Filter/search state
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // Fetch stays in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "stays"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Stay[];
      setStays(data);
      setFilteredStays(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Filter stays
  useEffect(() => {
    let result = stays;

    if (search.trim()) {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.location.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (minPrice) result = result.filter((s) => s.price >= parseInt(minPrice));
    if (maxPrice) result = result.filter((s) => s.price <= parseInt(maxPrice));

    setFilteredStays(result);
  }, [search, minPrice, maxPrice, stays]);

  const getNights = () => {
    if (!checkIn || !checkOut) return 0;
    const diffTime = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleBookNow = async (stay: Stay) => {
    if (!checkIn || !checkOut) return alert("Select check-in and check-out dates.");
    if (new Date(checkOut) <= new Date(checkIn)) return alert("Check-out must be after check-in.");
    if (guests < 1 || guests > 10) return alert("Guests must be between 1 and 10.");

    const nights = getNights();
    if (nights <= 0) return alert("Invalid date selection.");

    setPaymentLoadingMap((prev) => ({ ...prev, [stay.id]: true }));

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return alert("Please login first.");

      const totalPrice = stay.price * guests * nights;

      // 1️⃣ Create Razorpay order on server
      const orderRes = await fetch("/api/payments/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: totalPrice }),
      });
      const { order } = await orderRes.json();
      if (!order?.id) throw new Error("Failed to create order.");

      // 2️⃣ Razorpay checkout
      const rzp = new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY!,
        amount: order.amount,
        currency: "INR",
        name: "BharatComfort",
        description: `${stay.name} booking (${nights} night${nights > 1 ? "s" : ""})`,
        order_id: order.id,
        handler: async (response: any) => {
          // 3️⃣ Verify payment & create booking
          const verifyRes = await fetch("/api/bookings/confirm", {
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
              totalPrice,
              userId: user.uid,
            }),
          });
          const data = await verifyRes.json();

          if (data.success) {
            alert("✅ Booking confirmed!");

            // Partner notification
            if (stay.partnerId) {
              await addDoc(collection(db, "notifications"), {
                title: `New Booking: ${stay.name}`,
                message: `${user.displayName || "A guest"} booked from ${checkIn} to ${checkOut} for ${guests} guest(s)`,
                listingId: stay.id,
                userId: stay.partnerId,
                status: "unread",
                createdAt: serverTimestamp(),
              });
            }
          } else {
            alert("❌ Payment verification failed.");
          }
        },
        prefill: {
          name: user.displayName || undefined,
          email: user.email || undefined,
          contact: user.phoneNumber || undefined,
        },
        theme: { color: "#4f46e5" },
      });

      rzp.open();
    } catch (err: any) {
      console.error("Booking error:", err);
      alert("❌ Payment failed: " + err.message);
    } finally {
      setPaymentLoadingMap((prev) => ({ ...prev, [stay.id]: false }));
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading stays...</div>;

  return (
    <motion.div className="min-h-screen bg-gray-50 p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <h1 className="text-3xl font-bold mb-6 text-center">Available Stays</h1>

      {/* Search & Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
        <input type="text" placeholder="Search by name or location" value={search} onChange={(e) => setSearch(e.target.value)} className="border rounded-lg p-2 w-full sm:w-64" />
        <input type="number" placeholder="Min Price" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="border rounded-lg p-2 w-24" />
        <input type="number" placeholder="Max Price" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="border rounded-lg p-2 w-24" />
        <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="border rounded-lg p-2" />
        <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="border rounded-lg p-2" />
        <input type="number" min={1} max={10} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="border rounded-lg p-2 w-24" />
      </div>

      {filteredStays.length === 0 ? (
        <p className="text-center text-gray-500">No stays found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStays.map((stay) => {
            const nights = getNights();
            const totalPrice = stay.price * guests * nights;
            const isLoading = paymentLoadingMap[stay.id] || false;

            return (
              <motion.div key={stay.id} className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-shadow" whileHover={{ scale: 1.03 }}>
                <img src={stay.image || "/placeholder.jpg"} alt={stay.name} className="h-48 w-full object-cover" />
                <div className="p-4">
                  <h2 className="font-semibold text-lg">{stay.name}</h2>
                  <p className="text-sm text-gray-500">{stay.location}</p>
                  <p className="text-indigo-600 font-bold mt-2">₹{stay.price}/night</p>
                  <p className="text-gray-600 text-sm mt-1">{nights} night(s) • {guests} guest(s) • Total ₹{totalPrice}</p>
                  <button onClick={() => handleBookNow(stay)} disabled={isLoading || nights === 0} className={`mt-3 w-full py-2 rounded-xl transition ${isLoading || nights === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}>
                    {isLoading ? "Processing..." : "Book Now"}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
