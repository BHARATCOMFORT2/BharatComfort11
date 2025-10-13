"use client";

import React, { useEffect, useState, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, onSnapshot, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Loading from "@/components/Loading";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getAuth } from "firebase/auth";
import { Dialog, Transition } from "@headlessui/react";

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
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [guests, setGuests] = useState<number>(1);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Fetch stay in real-time
  useEffect(() => {
    if (!stayId) return;

    setLoading(true);
    const docRef = doc(db, "stays", stayId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setStay({ id: docSnap.id, ...(docSnap.data() as Stay) });
      } else {
        setStay(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [stayId]);

  const getNights = () => {
    if (!checkIn || !checkOut) return 0;
    const diffTime = checkOut.getTime() - checkIn.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const nights = getNights();
  const totalPrice = stay ? stay.price * guests * nights : 0;

  const openConfirm = () => {
    if (!checkIn || !checkOut) {
      alert("Please select check-in and check-out dates");
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setIsConfirmOpen(false);
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      alert("Please log in to continue with booking.");
      router.push(`/login?redirect=/stays/${stayId}`);
      return;
    }

    if (!stay) return;

    setPaymentLoading(true);
    try {
      // 1️⃣ Create booking/order on server
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          partnerId: stay.partnerId || null,
          listingId: stay.id,
          amount: totalPrice,
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
          guests,
        }),
      });
      if (!res.ok) throw new Error("Failed to create booking/order");
      const data = await res.json();

      // 2️⃣ Razorpay checkout
      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) throw new Error("Razorpay SDK not loaded");

      const rzp = new Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY as string,
        amount: totalPrice * 100,
        currency: "INR",
        name: stay.name,
        description: `${nights} night(s)`,
        order_id: data.id,
        handler: async (response: any) => {
          try {
            // Confirm booking on backend
            const confirmRes = await fetch("/api/bookings/confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bookingId: data.bookingId,
                orderId: data.id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                userId: user.uid,
                status: "confirmed",
              }),
            });

            if (!confirmRes.ok) throw new Error("Booking confirmation failed");
            const confirmData = await confirmRes.json();

            // 🔔 Firestore notification for partner
            if (stay.partnerId) {
              await addDoc(collection(db, "notifications"), {
                title: `New Booking: ${stay.name}`,
                message: `Booking from ${checkIn?.toLocaleDateString()} to ${checkOut?.toLocaleDateString()} for ${guests} guest(s).`,
                listingId: stay.id,
                bookingId: confirmData.bookingId || data.bookingId,
                userId: stay.partnerId,
                status: "unread",
                createdAt: serverTimestamp(),
              });
            }

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

      <img
        src={stay.image || "/placeholder.jpg"}
        alt={stay.name}
        className="rounded-2xl w-full max-h-[400px] object-cover mb-6 shadow-md"
      />

      {/* Date pickers */}
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

      {/* Guests */}
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
          <div className="font-medium">{nights}</div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Total</div>
          <div className="font-bold text-indigo-600">₹{totalPrice}</div>
        </div>
      </div>

      <button
        onClick={openConfirm}
        disabled={paymentLoading || !checkIn || !checkOut}
        className={`px-6 py-3 text-white font-semibold rounded-lg transition ${
          paymentLoading || !checkIn || !checkOut
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-700"
        }`}
      >
        {paymentLoading ? "Processing..." : "Book Now"}
      </button>

      {/* Confirm Booking Modal */}
      <Transition appear show={isConfirmOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsConfirmOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title className="text-lg font-medium text-gray-900">
                    Confirm Booking
                  </Dialog.Title>
                  <div className="mt-2 text-gray-700">
                    <p>Stay: {stay.name}</p>
                    <p>Check-in: {checkIn?.toLocaleDateString()}</p>
                    <p>Check-out: {checkOut?.toLocaleDateString()}</p>
                    <p>Guests: {guests}</p>
                    <p className="mt-2 font-semibold">Total: ₹{totalPrice}</p>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      className="px-4 py-2 bg-gray-200 rounded-lg"
                      onClick={() => setIsConfirmOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
                      onClick={handleConfirm}
                    >
                      Confirm & Pay
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
