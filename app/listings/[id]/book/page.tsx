"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { differenceInDays, format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { openRazorpayCheckout } from "@/lib/payments-razorpay";

export default function BookingPage() {
  const params = useParams();
  const listingId = params?.listingId as string;

  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  const [guests, setGuests] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);

  const [isPaying, setIsPaying] = useState(false);

  /* Real-time listing listener */
  useEffect(() => {
    if (!listingId) return;

    const ref = doc(db, "listings", listingId);

    const unsubscribe = onSnapshot(
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
        console.error("Listing fetch error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [listingId]);

  /* Calculate total price */
  useEffect(() => {
    if (!checkIn || !checkOut || !listing?.price) {
      setTotalPrice(0);
      return;
    }

    const nights = differenceInDays(new Date(checkOut), new Date(checkIn));

    if (nights <= 0) {
      setTotalPrice(0);
      return;
    }

    setTotalPrice(nights * listing.price * guests);
  }, [checkIn, checkOut, guests, listing]);

  /* Payment */
  const handlePayment = async () => {
    if (!checkIn || !checkOut || totalPrice <= 0) return;

    setIsPaying(true);

    try {
      const res = await fetch("/api/payments/create-order", {
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

      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      openRazorpayCheckout({
        amount: data.amount,
        orderId: data.id,
        name: "BHARATCOMFORT",

        email: "user@example.com", // replace with auth user
        phone: "9999999999",

        onSuccess: async (response: any) => {
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

          if (result.success) {
            alert("✅ Booking confirmed!");
          } else {
            alert("❌ Payment verification failed");
          }
        },

        onFailure: () => {
          alert("❌ Payment cancelled");
        },
      });
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Payment error");
    } finally {
      setIsPaying(false);
    }
  };

  if (loading)
    return <div className="p-8 text-center">Loading...</div>;

  if (!listing)
    return <div className="p-8 text-center">Listing not found</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Booking Form */}
      <div className="md:col-span-2 bg-white rounded-2xl shadow-lg p-6 space-y-6 border">
        <h2 className="text-2xl font-semibold">{listing.name}</h2>

        <p className="text-gray-500">{listing.location}</p>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Check-In</label>

            <input
              type="date"
              className="w-full border rounded-lg p-2"
              value={checkIn}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Check-Out</label>

            <input
              type="date"
              className="w-full border rounded-lg p-2"
              value={checkOut}
              min={checkIn}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </div>
        </div>

        {/* Guests */}
        <div>
          <label className="text-sm font-medium">Guests</label>

          <input
            type="number"
            min={1}
            max={10}
            className="w-full border rounded-lg p-2"
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Summary */}
      <Card className="p-6 space-y-3 shadow-xl rounded-2xl border bg-white sticky top-20">
        <h3 className="text-xl font-semibold">Booking Summary</h3>

        <p className="text-gray-600">{listing.name}</p>
        <p className="text-gray-600">₹{listing.price} / night</p>

        <hr />

        {checkIn && checkOut && (
          <p className="text-sm text-gray-700">
            {format(new Date(checkIn), "MMM dd")} →{" "}
            {format(new Date(checkOut), "MMM dd")}
          </p>
        )}

        {totalPrice > 0 && (
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>₹{totalPrice}</span>
          </div>
        )}

        <Button
          onClick={handlePayment}
          disabled={!checkIn || !checkOut || totalPrice === 0 || isPaying}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3"
        >
          {isPaying ? "Processing..." : "Proceed to Payment"}
        </Button>
      </Card>
    </div>
  );
}
