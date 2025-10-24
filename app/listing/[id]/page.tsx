"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
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
  images?: string[];
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

  // 🏨 Booking state
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [totalNights, setTotalNights] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [dateError, setDateError] = useState<string | null>(null);

  /* ---------------------------------------------------
     🔐 Auth Listener
  --------------------------------------------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  /* ---------------------------------------------------
     🏡 Fetch listing details
  --------------------------------------------------- */
  useEffect(() => {
    if (!id) return;
    const ref = doc(db, "listings", id as string);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) setListing({ id: snap.id, ...(snap.data() as Listing) });
        else setListing(null);
        setLoading(false);
      },
      (err) => {
        console.error("❌ Error fetching listing:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [id]);

  /* ---------------------------------------------------
     💬 Fetch reviews
  --------------------------------------------------- */
  useEffect(() => {
    if (!id) return;
    const ref = doc(db, "reviews", id as string);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setReviews(snap.data().reviews || []);
      else setReviews([]);
    });
    return () => unsub();
  }, [id]);

  /* ---------------------------------------------------
     🧮 Date Validation + Price Calculation
  --------------------------------------------------- */
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

    // Reset error first
    setDateError(null);

    if (start < today.setHours(0, 0, 0, 0)) {
      setDateError("Check-in date cannot be in the past.");
      setTotalNights(0);
      setTotalPrice(0);
      return;
    }

    if (end <= start) {
      setDateError("Check-out date must be after check-in date.");
      setTotalNights(0);
      setTotalPrice(0);
      return;
    }

    const diffTime = Math.max(0, end.getTime() - start.getTime());
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    setTotalNights(nights);
    setTotalPrice(nights * listing.price);
  }, [checkIn, checkOut, listing]);

  /* ---------------------------------------------------
     💳 Handle Booking
  --------------------------------------------------- */
  const handleBookNow = () => {
    if (!listing?.id) return;

    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (totalNights <= 0 || dateError) {
      alert(dateError || "Please select valid check-in and check-out dates.");
      return;
    }

    const params = new URLSearchParams({
      checkIn,
      checkOut,
      nights: totalNights.toString(),
      total: totalPrice.toString(),
    });

    router.push(`/listing/${listing.id}/book?${params.toString()}`);
  };

  /* ---------------------------------------------------
     🧱 Loading / Not Found
  --------------------------------------------------- */
  if (loading)
    return <div className="text-center py-12 text-gray-600">Loading listing...</div>;

  if (!listing)
    return (
      <div className="text-center py-12 text-gray-600">
        Listing not found or may have been removed.
      </div>
    );

  /* ---------------------------------------------------
     🖼️ Render Page
  --------------------------------------------------- */
  return (
    <div className="container mx-auto px-4 py-12">
      {/* ✨ Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold">{listing.name}</h1>
        <p className="text-gray-600">
          {listing.category} • {listing.location}
        </p>
        <p className="mt-2 text-lg font-semibold text-gray-800">
          ₹{listing.price?.toLocaleString()}/night
        </p>
        {listing.rating && (
          <p className="text-yellow-500 mt-1">⭐ {listing.rating.toFixed(1)}</p>
        )}
      </header>

      {/* 🖼️ Image Gallery */}
      {listing.images && listing.images.length > 0 && (
        <section className="mb-12">
          <ImageGallery images={listing.images} />
        </section>
      )}

      {/* 📜 Details + Booking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Details */}
        <article className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">About</h2>
          <p className="text-gray-700 leading-relaxed">{listing.description}</p>
        </article>

        {/* Right: Booking Card */}
        <aside className="border rounded-lg shadow-lg p-6 bg-white sticky top-24">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Ready to book?
          </h3>

          {/* 🗓️ Date Inputs */}
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm text-gray-600">Check-in</label>
              <input
                type="date"
                value={checkIn}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full border rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Check-out</label>
              <input
                type="date"
                value={checkOut}
                min={checkIn || new Date().toISOString().split("T")[0]}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full border rounded-lg p-2"
              />
            </div>
          </div>

          {/* ⚠️ Date Validation Error */}
          {dateError && (
            <p className="text-red-600 text-sm mb-3 text-center">{dateError}</p>
          )}

          {/* 💰 Price Summary */}
          {totalNights > 0 && !dateError && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4 border text-sm">
              <div className="flex justify-between">
                <span>
                  ₹{listing.price.toLocaleString()} × {totalNights} night
                  {totalNights > 1 ? "s" : ""}
                </span>
                <span>₹{totalPrice.toLocaleString()}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>₹{totalPrice.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* 🟡 Book Now */}
          <Button
            onClick={handleBookNow}
            disabled={!checkIn || !checkOut || !!dateError}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-lg font-medium disabled:opacity-60"
          >
            {user ? "Book Now" : "Login to Book"}
          </Button>

          <p className="mt-3 text-xs text-center text-gray-500">
            {user
              ? "Secure checkout powered by Razorpay"
              : "Please login or register to continue booking"}
          </p>
        </aside>
      </div>

      {/* ⭐ Reviews */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-6">Guest Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-gray-500">No reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </section>

      {/* 🔐 Login/Register Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        bookingCallback={() =>
          router.push(`/listing/${listing?.id}/book?checkIn=${checkIn}&checkOut=${checkOut}`)
        }
      />
    </div>
  );
}
