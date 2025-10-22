"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { differenceInDays, format } from "date-fns";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { startPayment } from "@/lib/payments/client";
import { requireAuthUser } from "@/lib/auth-client"; // ✅ added helper for strict auth

export default function BookingPage() {
  const { id } = useParams();
  const router = useRouter();

  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(undefined); // undefined = loading, null = not logged in
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isPaying, setIsPaying] = useState(false);

  // 🔐 Auth Check — Real-time listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser || null);
    });
    return () => unsubscribe();
  }, []);

  // 🏠 Realtime Listing Data
  useEffect(() => {
    if (!id) return;
    const ref = doc(db, "listings", id as string);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setListing({ id: snap.id, ...snap.data() });
      } else {
        setListing(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  // 💰 Auto Price Calculation
  useEffect(() => {
    if (checkIn && checkOut && listing?.price) {
      const nights = differenceInDays(new Date(checkOut), new Date(checkIn));
      setTotalPrice(nights > 0 ? nights * listing.price * guests : 0);
    }
  }, [checkIn, checkOut, guests, listing]);

  // 💳 Handle Secure Payment
  const handlePayment = async () => {
    try {
      // 🔒 Enforce authentication (double check)
      const currentUser = await requireAuthUser().catch(() => null);
      if (!currentUser) {
        alert("Please log in to continue booking.");
        router.push(`/login?redirect=/listing/${id}/book`);
        return;
      }

      // 🧩 Validate form
      if (!checkIn || !checkOut || totalPrice <= 0) {
        alert("Please select valid dates before booking.");
        return;
      }

      setIsPaying(true);

      // 💰 Trigger payment flow
      await startPayment({
        amount: totalPrice,
        context: "booking",
        listingId: id as string,
        userId: currentUser.uid,
        name: listing?.name || "BHARATCOMFORT Stay",
        email: currentUser.email || "unknown@bharatcomfort.com",
        phone: currentUser.phoneNumber || "9999999999",
        onSuccess: (msg) => {
          alert("✅ " + msg);
          router.push("/bookings");
        },
        onFailure: (msg) => {
          alert("❌ " + msg);
        },
      });
    } catch (err) {
      console.error("❌ Payment failed:", err);
      alert("Payment could not be processed. Please try again.");
    } finally {
      setIsPaying(false);
    }
  };

  // 🔒 Auth gate before rendering UI
  if (user === undefined)
    return <div className="text-center py-10 text-gray-500">Checking login status...</div>;

  if (!user)
    return (
      <div className="text-center py-12 text-gray-600">
        Please{" "}
        <button
          onClick={() => router.push(`/login?redirect=/listing/${id}/book`)}
          className="text-blue-600 underline"
        >
          log in
        </button>{" "}
        to book this stay.
      </div>
    );

  // 🕒 Loading or missing listing
  if (loading) return <div className="text-center py-10 text-gray-500">Loading...</div>;
  if (!listing) return <div className="text-center py-10 text-gray-500">Listing not found</div>;

  // 🎨 UI Layout
  return (
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* LEFT SIDE — Booking Form */}
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

      {/* RIGHT SIDE — Booking Summary */}
      <Card className="p-6 space-y-3 shadow-xl rounded-2xl border bg-white sticky top-20">
        <h3 className="text-xl font-semibold">Booking Summary</h3>
        <p className="text-gray-600">{listing.name}</p>

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
          disabled={
            !user ||
            !checkIn ||
            !checkOut ||
            totalPrice === 0 ||
            isPaying ||
            user === undefined
          }
        >
          {isPaying ? "Processing..." : "Proceed to Payment"}
        </Button>
      </Card>
    </div>
  );
}
