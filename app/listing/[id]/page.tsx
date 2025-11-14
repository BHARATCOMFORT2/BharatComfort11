"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  doc,
  onSnapshot,
  collection,
  onSnapshot as onBookingSnapshot,
} from "firebase/firestore";
import ImageGallery from "@/components/ui/ImageGallery";
import ReviewCard from "@/components/reviews/ReviewCard";
import { Button } from "@/components/ui/Button";
import LoginModal from "@/components/auth/LoginModal";
import { onAuthStateChanged } from "firebase/auth";

interface Listing {
  id?: string;
  name: string;
  category: string;
  location: string;
  description: string;
  price: number;
  rating?: number;
  partnerId?: string;
  images?: string[];
  unavailableDates?: string[];
}

interface Review {
  id: string;
  user: string;
  rating: number;
  comment: string;
}

export default function ListingDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [user, setUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Booking state
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [totalNights, setTotalNights] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [dateError, setDateError] = useState<string | null>(null);

  /* AUTH LISTENER */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  /* FETCH LISTING DETAILS */
  useEffect(() => {
    if (!id) return;
    const ref = doc(db, "listings", id as string);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Listing;
          setListing({
            id: snap.id,
            ...data,
            unavailableDates: data.unavailableDates || [],
          });
        } else setListing(null);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching listing:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [id]);

  /* REAL-TIME UNAVAILABLE DATES */
  useEffect(() => {
    if (!id) return;
    const q = collection(db, "bookings");
    const unsub = onBookingSnapshot(q, (snap) => {
      const bookedDates: string[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.listingId === id) {
          const current = new Date(data.checkIn);
          const end = new Date(data.checkOut);
          while (current <= end) {
            bookedDates.push(current.toISOString().split("T")[0]);
            current.setDate(current.getDate() + 1);
          }
        }
      });
      setListing((prev) =>
        prev ? { ...prev, unavailableDates: bookedDates } : prev
      );
    });
    return () => unsub();
  }, [id]);

  /* FETCH REVIEWS */
  useEffect(() => {
    if (!id) return;
    const ref = doc(db, "reviews", id as string);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setReviews(snap.data().reviews || []);
      else setReviews([]);
    });
    return () => unsub();
  }, [id]);

  /* PRICE & DATE VALIDATION */
  const isUnavailable = (date: string) =>
    listing?.unavailableDates?.includes(date);

  useEffect(() => {
    if (!checkIn || !checkOut || !listing?.price) {
      setTotalNights(0);
      setTotalPrice(0);
      setDateError(null);
      return;
    }

    const today = new Date();
    const start = new Date(checkIn);
    const end = new Date(checkOut);

    if (start < new Date(today.setHours(0, 0, 0, 0))) {
      setDateError("Check-in cannot be in the past.");
      return;
    }

    if (end <= start) {
      setDateError("Checkout must be after check-in.");
      return;
    }

    if (isUnavailable(checkIn) || isUnavailable(checkOut)) {
      setDateError("Selected dates are unavailable.");
      return;
    }

    const diff = Math.ceil((end.getTime() - start.getTime()) / 86400000);
    setTotalNights(diff);
    setTotalPrice(diff * listing.price);
    setDateError(null);
  }, [checkIn, checkOut, listing]);

  /* FIXED BOOK NOW BUTTON */
  const handleBookNow = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!listing?.id || !listing?.partnerId) {
      alert("Listing missing partnerId.");
      return;
    }

    if (!checkIn || !checkOut || totalPrice <= 0) {
      alert("Please select valid dates.");
      return;
    }

    try {
      const token = await user.getIdToken();

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listingId: listing.id,
          partnerId: listing.partnerId,
          amount: totalPrice,
          checkIn,
          checkOut,
          paymentMode: "razorpay",
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Booking API failed:", err);
        alert("Failed: " + err);
        return;
      }

      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Booking failed.");
        return;
      }

      router.push(
        `/listing/${listing.id}/book?checkIn=${checkIn}&checkOut=${checkOut}`
      );
    } catch (err) {
      console.error("Booking error:", err);
      alert("Something went wrong.");
    }
  };

  /* RENDER PAGE */
  if (loading)
    return <div className="text-center py-8">Loading listing...</div>;

  if (!listing)
    return (
      <div className="text-center py-8 text-gray-600">
        Listing not found or removed.
      </div>
    );

  return (
    <div className="container mx-auto px-4 py-12">
      <header>
        <h1 className="text-3xl font-bold">{listing.name}</h1>
        <p className="text-gray-600">{listing.category} • {listing.location}</p>
        <p className="font-semibold mt-1">₹{listing.price}/night</p>
      </header>

      {/* IMAGES */}
      {listing.images && <ImageGallery images={listing.images} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-3">About</h2>
          <p>{listing.description}</p>
        </div>

        <aside className="p-6 bg-white border rounded-lg shadow sticky top-24">
          <h3 className="text-lg font-bold mb-4">Booking</h3>

          <div className="space-y-3">
            <div>
              <label>Check-in</label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label>Check-out</label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>

            {totalPrice > 0 && (
              <p className="font-semibold">Total: ₹{totalPrice}</p>
            )}

            <Button
              onClick={handleBookNow}
              disabled={!checkIn || !checkOut || !!dateError}
              className="w-full bg-yellow-600 text-white"
            >
              {user ? "Book Now" : "Login to Book"}
            </Button>

            {dateError && (
              <p className="text-red-500 text-sm text-center">{dateError}</p>
            )}
          </div>
        </aside>
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Reviews</h2>
        {reviews.length === 0 ? (
          <p>No reviews yet.</p>
        ) : (
          reviews.map((r) => <ReviewCard key={r.id} review={r} />)
        )}
      </section>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => setUser(auth.currentUser)}
      />
    </div>
  );
}
