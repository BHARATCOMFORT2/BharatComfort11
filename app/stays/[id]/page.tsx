"use client";

import { useEffect, useState, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Loading from "@/components/Loading";
import { Dialog, Transition } from "@headlessui/react";

export default function StayPage() {
  const params = useParams();
  const router = useRouter();
  const stayId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [stay, setStay] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // booking states
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [guests, setGuests] = useState<number>(1);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // user
  const [user, setUser] = useState<any>(null);

  // 🔐 Auth listener for real-time user ID
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 🏠 Fetch stay data
  useEffect(() => {
    if (!stayId) return;

    const fetchStay = async () => {
      try {
        const docRef = doc(db, "stays", stayId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setStay({ id: docSnap.id, ...docSnap.data() });
      } catch (err) {
        console.error("Error fetching stay:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStay();
  }, [stayId]);

  // 🧮 Helper to calculate nights
  const getNights = () => {
    if (!checkIn || !checkOut) return 0;
    const diffTime = checkOut.getTime() - checkIn.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const totalPrice = stay ? stay.price * guests * getNights() : 0;

  // 💳 Booking & payment handler
  const handleBooking = async () => {
    if (!user) {
      alert("Please log in to continue with booking.");
      router.push(`/login?redirect=/stays/${stayId}`);
      return;
    }

    if (!stay || !checkIn || !checkOut) {
      alert("Please select check-in and check-out dates");
      return;
    }

    setPaymentLoading(true);

    try {
      // 1️⃣ Create order in backend
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid, // ✅ real authenticated user
          partnerId: stay.partnerId,
          listingId: stay.id,
          amount: totalPrice,
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
          guests,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Booking failed");

      // 2️⃣ Razorpay payment UI
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
        amount: data.amount,
        currency: data.currency,
        name: stay.name,
        description: `Booking for ${stay.name}`,
        order_id: data.orderId,
        handler: async function (response: any) {
          try {
            // 3️⃣ Confirm booking
            const confirmRes = await fetch("/api/bookings/confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bookingId: data.bookingId,
                userId: user.uid,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const confirmData = await confirmRes.json();
            if (confirmData.success) {
              alert("✅ Booking successful!");
              router.push("/dashboard/bookings"); // Redirect to user dashboard bookings
            } else {
              alert("⚠️ Payment verified but booking update failed");
            }
          } catch (err) {
            console.error("Booking confirm error:", err);
            alert("Payment verified but booking update failed.");
          }
        },
        prefill: {
          name: user.displayName || "",
          email: user.email || "",
        },
        theme: { color: "#4F46E5" },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("Payment failed:", err);
      alert("Payment failed: " + err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Confirm modal
  const openConfirm = () => {
    if (!checkIn || !checkOut) {
      alert("Please select check-in and check-out dates");
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setIsConfirmOpen(false);
    await handleBooking();
  };

  if (loading) return <Loading message="Loading stay..." />;
  if (!stay) return <div className="text-center mt-10 text-gray-500">Stay not found.</div>;

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

      {/* Date inputs and guests */}
      <div className="grid md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-600">Check-in</label>
          <input
            type="date"
            className="mt-1 w-full p-2 border rounded-lg"
            onChange={(e) => setCheckIn(new Date(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600">Check-out</label>
          <input
            type="date"
            className="mt-1 w-full p-2 border rounded-lg"
            onChange={(e) => setCheckOut(new Date(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600">Guests</label>
          <input
            type="number"
            min="1"
            value={guests}
            onChange={(e) => setGuests(parseInt(e.target.value))}
            className="mt-1 w-full p-2 border rounded-lg"
          />
        </div>
      </div>

      <p className="text-lg font-semibold text-gray-700 mb-6">
        Total: ₹{totalPrice} ({getNights()} nights)
      </p>

      <button
        onClick={openConfirm}
        disabled={paymentLoading}
        className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
      >
        {paymentLoading ? "Processing..." : "Book Now"}
      </button>

      {/* Confirmation Modal */}
      <Transition appear show={isConfirmOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsConfirmOpen(false)}>
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
            <div className="flex items-center justify-center min-h-full p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-2xl shadow-xl">
                  <Dialog.Title className="text-lg font-semibold text-gray-800 mb-4">
                    Confirm Booking
                  </Dialog.Title>
                  <p className="text-gray-600 mb-6">
                    Are you sure you want to book <b>{stay.name}</b> from{" "}
                    {checkIn?.toLocaleDateString()} to {checkOut?.toLocaleDateString()} for{" "}
                    <b>{guests}</b> guest(s)?
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setIsConfirmOpen(false)}
                      className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirm}
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      Confirm
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
