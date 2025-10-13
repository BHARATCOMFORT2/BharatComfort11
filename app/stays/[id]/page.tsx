"use client";

import { Fragment, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, onSnapshot, addDoc, serverTimestamp, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Loading from "@/components/Loading";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getAuth } from "firebase/auth";
import { Dialog, Transition } from "@headlessui/react";

interface Stay {
  id: string;
  name: string;
  location: string;
  price: number;
  image?: string;
  partnerId?: string;
}

// Main Stay Page
export default function StayPage() {
  const params = useParams();
  const router = useRouter();
  const stayId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [stay, setStay] = useState<Stay | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Booking state
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [guests, setGuests] = useState(1);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Search filters
  const [searchLocation, setSearchLocation] = useState("");
  const [searchMinPrice, setSearchMinPrice] = useState<number | "">("");
  const [searchMaxPrice, setSearchMaxPrice] = useState<number | "">("");

  // Fetch stay
  useEffect(() => {
    if (!stayId) return;
    setLoading(true);
    const docRef = doc(db, "stays", stayId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) setStay({ id: docSnap.id, ...(docSnap.data() as any) });
      else setStay(null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [stayId]);

  // Calculate nights and total price
  const getNights = () => {
    if (!checkIn || !checkOut) return 0;
    const diffTime = checkOut.getTime() - checkIn.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  const nights = getNights();
  const totalPrice = stay ? stay.price * guests * nights : 0;

  // Open confirmation modal
  const openConfirm = () => {
    if (!checkIn || !checkOut) {
      alert("Please select check-in and check-out dates.");
      return;
    }
    setIsConfirmOpen(true);
  };

  // Handle Razorpay booking
  const handleConfirm = async () => {
    setIsConfirmOpen(false);
    if (!stay || !checkIn || !checkOut) return;
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      alert("Please log in to book.");
      router.push(`/login?redirect=/stays/${stayId}`);
      return;
    }
    setPaymentLoading(true);

    try {
      // 1️⃣ Create Razorpay order on server
      const orderRes = await fetch("/api/bookings", {
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
      const data = await orderRes.json();
      if (!data || !data.id) throw new Error("Order creation failed");

      // 2️⃣ Razorpay Checkout
      const Razorpay = (window as any).Razorpay;
      const rzp = new Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY!,
        amount: totalPrice * 100,
        currency: "INR",
        name: stay.name,
        order_id: data.id,
        handler: async (response: any) => {
          // 3️⃣ Verify payment & store booking
          try {
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
            const confirmData = await confirmRes.json();

            // 4️⃣ Add notification for partner
            await addDoc(collection(db, "notifications"), {
              title: `New Booking: ${stay.name}`,
              message: `Booking from ${checkIn.toLocaleDateString()} to ${checkOut.toLocaleDateString()} for ${guests} guest(s).`,
              listingId: stay.id,
              bookingId: confirmData.bookingId || data.bookingId,
              userId: stay.partnerId,
              status: "unread",
              createdAt: serverTimestamp(),
            });

            alert("✅ Payment successful! Booking confirmed.");
            router.push(`/bookings/${confirmData.bookingId || data.bookingId}`);
          } catch (err) {
            console.error("Booking confirm error:", err);
            alert("Payment succeeded but booking confirmation failed.");
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
      console.error("Payment error:", err);
      alert("Payment failed: " + err.message);
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input type="text" placeholder="Search location" value={searchLocation} onChange={(e) => setSearchLocation(e.target.value)} className="border rounded-lg p-2 flex-1" />
        <input type="number" placeholder="Min Price" value={searchMinPrice} onChange={(e) => setSearchMinPrice(Number(e.target.value))} className="border rounded-lg p-2 w-32" />
        <input type="number" placeholder="Max Price" value={searchMaxPrice} onChange={(e) => setSearchMaxPrice(Number(e.target.value))} className="border rounded-lg p-2 w-32" />
      </div>

      {/* Date Pickers */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <label className="block mb-1 font-medium">Check-in</label>
          <DatePicker
            selected={checkIn}
            onChange={(date) => setCheckIn(date)}
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
            onChange={(date) => setCheckOut(date)}
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
        <input type="number" min={1} max={10} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="w-24 border rounded-lg p-2" />
      </div>

      {/* Price Summary */}
      <div className="mb-6 p-4 rounded-lg bg-white shadow-sm border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Price per night</span>
          <span className="font-medium">₹{stay.price}</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Nights</span>
          <span className="font-medium">{nights}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Total</span>
          <span className="font-bold text-indigo-600">₹{totalPrice}</span>
        </div>
      </div>

      {/* Book Now Button */}
      <button
        onClick={openConfirm}
        disabled={paymentLoading}
        className={`px-6 py-3 text-white font-semibold rounded-lg transition ${paymentLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
      >
        {paymentLoading ? "Processing..." : "Book Now"}
      </button>

      {/* Confirmation Modal */}
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
                  <Dialog.Title className="text-lg font-medium text-gray-900">Confirm Booking</Dialog.Title>
                  <div className="mt-2 text-gray-700">
                    <p>Stay: {stay.name}</p>
                    <p>Check-in: {checkIn?.toLocaleDateString()}</p>
                    <p>Check-out: {checkOut?.toLocaleDateString()}</p>
                    <p>Guests: {guests}</p>
                    <p className="mt-2 font-semibold">Total: ₹{totalPrice}</p>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button className="px-4 py-2 bg-gray-200 rounded-lg" onClick={() => setIsConfirmOpen(false)}>Cancel</button>
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg" onClick={handleConfirm}>Confirm & Pay</button>
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
