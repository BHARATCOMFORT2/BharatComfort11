"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore"; // ✅ real-time listener
import { differenceInDays, format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { openRazorpayCheckout } from "@/lib/payments-razorpay"; // ✅ unified Razorpay helper

export default function BookingPage() {
  const { listingId } = useParams();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isPaying, setIsPaying] = useState(false);

  // ✅ Real-time Firestore subscription
  useEffect(() => {
    if (!listingId) return;

    const ref = doc(db, "listings", listingId as string);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setListing(snap.data());
        } else {
          setListing(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching listing:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe(); // cleanup listener
  }, [listingId]);

  // ✅ Auto-update total price whenever inputs or listing change
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

  // ✅ Payment flow using unified helper
  const handlePayment = async () => {
    if (!checkIn || !checkOut || totalPrice <= 0) return;
    setIsPaying(true);

    try {
      // Step 1 — Create Razorpay order via backend
      const orderResponse = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalPrice,
          listingId,
          checkIn,
          checkOut,
          guests,
        }),
      });

      const data = await orderResponse.json();
      if (!data.success) throw new Error(data.error || "Failed to create order");

      // Step 2 — Open Razorpay checkout
      openRazorpayCheckout({
        amount: data.amount,
        orderId: data.id,
        name: "BHARATCOMFORT",
        email: "demo@bharatcomfort.com", // replace with logged-in user
        phone: "9999999999",
        onSuccess: async (response: any) => {
          // Step 3 — Verify payment
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              listingId,
              checkIn,
              checkOut,
              guests,
              totalPrice,
            }),
          });

          const result = await verifyRes.json();
          if (result.success) alert("✅ Booking confirmed!");
          else alert("❌ Payment verification failed");
        },
        onFailure: () => alert("❌ Payment cancelled or failed."),
      });
    } catch (err: any) {
      console.error("Payment error:", err);
      alert("Error: " + err.message);
    } finally {
      setIsPaying(false);
    }
  };

  // ✅ UI
  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!listing) return <div className="p-8 text-center">Listing not found</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* LEFT: Booking Form */}
      <div className="md:col-span-2 bg-white rounded-2xl shadow-lg p-6 space-y-6 border">
        <h2 className="text-2xl font-semibold">{listing.name}</h2>
        <p className="text-gray-500">{listing.location}</p>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
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

        {/* Guests */}
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

      {/* RIGHT: Summary Card */}
      <Card className="p-6 space-y-3 shadow-xl rounded-2xl border bg-white sticky top-20">
        <h3 className="text-xl font-semibold">Booking Summary</h3>
        <p className="text-gray-600">{listing.name}</p>
        <p className="text-gray-600">₹{listing.price} / night</p>
        <hr className="my-2" />
        {checkIn && checkOut && (
          <p className="text-sm text-gray-700">
            {format(new Date(checkIn), "MMM dd")} →{" "}
            {format(new Date(checkOut), "MMM dd")}
          </p>
        )}
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
