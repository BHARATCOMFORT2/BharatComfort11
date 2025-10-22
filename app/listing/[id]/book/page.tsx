"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { differenceInDays, format } from "date-fns";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { startPayment } from "@/lib/payments/client"; // ✅ Universal Razorpay flow

export default function BookingPage() {
  const { id } = useParams();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isPaying, setIsPaying] = useState(false);

  // ✅ Fetch listing data in real-time
  useEffect(() => {
    if (!id) return;
    const ref = doc(db, "listings", id as string);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setListing({ id: snap.id, ...snap.data() });
        } else {
          setListing(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("❌ Firestore error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [id]);

  // ✅ Calculate total price automatically
  useEffect(() => {
    if (checkIn && checkOut && listing?.price) {
      const nights = differenceInDays(new Date(checkOut), new Date(checkIn));
      if (nights > 0) {
        setTotalPrice(nights * listing.price * guests);
      } else {
        setTotalPrice(0);
      }
    }
  }, [checkIn, checkOut, guests, listing]);

  // ✅ Trigger payment flow
  const handlePayment = async () => {
    if (!checkIn || !checkOut || totalPrice <= 0) {
      alert("Please select valid dates.");
      return;
    }

    setIsPaying(true);
    try {
      await startPayment({
        amount: totalPrice,
        context: "booking",
        listingId: id as string,
        userId: "guest-user", // ✅ replace with logged-in user UID later
        name: listing?.name || "BHARATCOMFORT Stay",
        email: "guest@bharatcomfort.com",
        phone: "9999999999",
        onSuccess: (msg) => {
          alert("✅ " + msg);
        },
        onFailure: (msg) => {
          alert("❌ " + msg);
        },
      });
    } catch (err) {
      console.error("❌ Payment failed:", err);
      alert("Payment could not be processed");
    } finally {
      setIsPaying(false);
    }
  };

  // ✅ UI States
  if (loading)
    return <div className="text-center py-10 text-gray-500">Loading listing...</div>;
  if (!listing)
    return <div className="text-center py-10 text-gray-500">Listing not found</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Left: Booking Inputs */}
      <div className="md:col-span-2 bg-white rounded-2xl shadow-lg p-6 space-y-6 border">
        <h2 className="text-2xl font-semibold">{listing.name}</h2>
        <p className="text-gray-600">{listing.location}</p>
        <p className="text-gray-500">₹{listing.price} / night</p>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Check-In</label>
            <input
              type="date"
              className="w-full border rounded-lg p-2"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Check-Out</label>
            <input
              type="date"
              className="w-full border rounded-lg p-2"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Guests</label>
          <input
            type="number"
            min={1}
            className="w-full border rounded-lg p-2"
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Right: Booking Summary */}
      <Card className="p-6 space-y-3 shadow-xl rounded-2xl border bg-white sticky top-20">
        <h3 className="text-xl font-semibold">Booking Summary</h3>
        <p className="text-gray-600">{listing.name}</p>

        {checkIn && checkOut && (
          <p className="text-sm text-gray-700">
            {format(new Date(checkIn), "MMM dd")} →{" "}
            {format(new Date(checkOut), "MMM dd")}
          </p>
        )}

        <div className="flex justify-between mt-2">
          <span className="text-gray-700 font-medium">Guests:</span>
          <span>{guests}</span>
        </div>

        {totalPrice > 0 && (
          <div className="flex justify-between text-lg font-semibold mt-3">
            <span>Total</span>
            <span>₹{totalPrice}</span>
          </div>
        )}

        <Button
          onClick={handlePayment}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3"
          disabled={!checkIn || !checkOut || totalPrice === 0 || isPaying}
        >
          {isPaying ? "Processing..." : "Proceed to Payment"}
        </Button>
      </Card>
    </div>
  );
}
