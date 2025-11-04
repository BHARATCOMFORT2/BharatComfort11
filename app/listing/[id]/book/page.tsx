"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { differenceInDays, format } from "date-fns";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { startPayment } from "@/lib/payments/client";
import { requireAuthUser } from "@/lib/auth-client";
import { getFirebaseIdToken } from "@/lib/firebase-auth";
import { toast } from "sonner";

export default function BookingPage() {
  const { id } = useParams();
  const router = useRouter();

  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(undefined);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"razorpay" | "pay_at_hotel">(
    "razorpay"
  );

  // 🔐 Auth listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser || null);
    });
    return () => unsubscribe();
  }, []);

  // 🏠 Fetch listing data
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

  // 💰 Calculate total price
  useEffect(() => {
    if (checkIn && checkOut && listing?.price) {
      const nights = differenceInDays(new Date(checkOut), new Date(checkIn));
      setTotalPrice(nights > 0 ? nights * listing.price * guests : 0);
    }
  }, [checkIn, checkOut, guests, listing]);

  // 💳 Handle Booking (Razorpay or Pay-at-Hotel)
  const handleBooking = async () => {
    try {
      const currentUser = await requireAuthUser().catch(() => null);
      if (!currentUser) {
        router.push(`/auth/login?redirect=/listing/${id}/book`);
        return;
      }

      if (!checkIn || !checkOut || totalPrice <= 0) {
        toast.error("Please select valid dates before booking.");
        return;
      }

      setIsPaying(true);
      const token = await getFirebaseIdToken();

      // 🔹 Create booking on server (API validates pay-at-hotel option)
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listingId: id,
          checkIn,
          checkOut,
          paymentMode,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Booking failed");
        return;
      }

      // 💳 Online (Razorpay)
      if (paymentMode === "razorpay") {
        const { razorpayOrder } = data;
        await startPayment({
          amount: razorpayOrder.amount / 100,
          context: "booking",
          listingId: id as string,
          userId: currentUser.uid,
          name: listing?.name || "BHARATCOMFORT Stay",
          email: currentUser.email || "unknown@bharatcomfort.com",
          phone: currentUser.phoneNumber || "9999999999",
          orderId: razorpayOrder.id,
          onSuccess: (msg) => {
            toast.success("✅ " + msg);
            router.push("/user/dashboard/bookings");
          },
          onFailure: (msg) => {
            toast.error("❌ " + msg);
          },
        });
      }

      // 🏨 Pay-at-Hotel mode
      else {
        toast.success("Booking confirmed! Please pay at hotel.");
        router.push("/user/dashboard/bookings");
      }
    } catch (err) {
      console.error("❌ Booking error:", err);
      toast.error("Error creating booking");
    } finally {
      setIsPaying(false);
    }
  };

  if (loading)
    return <div className="text-center py-10 text-gray-500">Loading...</div>;

  if (!listing)
    return <div className="text-center py-10 text-gray-500">Listing not found</div>;

  // 🎨 UI Layout
  return (
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* LEFT — Booking Form */}
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

        {/* Payment Mode Toggle */}
        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium mb-1">Payment Mode</label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="razorpay"
              checked={paymentMode === "razorpay"}
              onChange={() => setPaymentMode("razorpay")}
            />
            <span>Pay Online (Razorpay)</span>
          </label>

          {listing.allowPayAtHotel && (
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="pay_at_hotel"
                checked={paymentMode === "pay_at_hotel"}
                onChange={() => setPaymentMode("pay_at_hotel")}
              />
              <span>Pay at Hotel / Restaurant</span>
            </label>
          )}
        </div>
      </div>

      {/* RIGHT — Summary */}
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
          onClick={handleBooking}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3"
          disabled={!checkIn || !checkOut || totalPrice === 0 || isPaying}
        >
          {isPaying
            ? "Processing..."
            : paymentMode === "razorpay"
            ? "Pay & Book"
            : "Confirm Booking"}
        </Button>

        {!user && (
          <p className="text-center text-sm text-gray-500 mt-3">
            You must log in before booking.
          </p>
        )}
      </Card>
    </div>
  );
}
