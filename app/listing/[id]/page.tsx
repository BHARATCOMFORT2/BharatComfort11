"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  DocumentData,
  QuerySnapshot,
} from "firebase/firestore";
import ImageGallery from "@/components/ui/ImageGallery";
import ReviewCard from "@/components/reviews/ReviewCard";
import { Button } from "@/components/ui/Button";
import LoginModal from "@/components/auth/LoginModal";
import { onAuthStateChanged, User } from "firebase/auth";
import { openRazorpayCheckout } from "@/lib/payments-razorpay"; // client export

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
  const [user, setUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Booking state
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [totalNights, setTotalNights] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [dateError, setDateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* AUTH LISTENER */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  /* FETCH LISTING DETAILS */
  useEffect(() => {
    if (!id) return;
    setLoading(true);
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

  /* REAL-TIME UNAVAILABLE DATES (FILTERED QUERY) */
  useEffect(() => {
    if (!id) return;

    // Query only bookings for this listing
    const q = query(
      collection(db, "bookings"),
      where("listingId", "==", id as string),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const bookedDates: string[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          try {
            const start = new Date(data.checkIn);
            const end = new Date(data.checkOut);
            const cur = new Date(start);
            while (cur <= end) {
              bookedDates.push(cur.toISOString().split("T")[0]);
              cur.setDate(cur.getDate() + 1);
            }
          } catch (e) {
            // ignore invalid date formats
          }
        });
        setListing((prev) =>
          prev ? { ...prev, unavailableDates: Array.from(new Set(bookedDates)) } : prev
        );
      },
      (err) => {
        console.error("Booking snapshot error:", err);
      }
    );

    return () => unsub();
  }, [id]);

  /* FETCH REVIEWS (simple doc-based storage) */
  useEffect(() => {
    if (!id) return;
    const ref = doc(db, "reviews", id as string);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setReviews(snap.data().reviews || []);
        } else setReviews([]);
      },
      (err) => {
        console.error("Error fetching reviews:", err);
        setReviews([]);
      }
    );
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

  /* FIXED BOOK NOW BUTTON (uses session cookie by sending credentials: 'include') */
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
      setSubmitting(true);

      const payload = {
        listingId: listing.id,
        partnerId: listing.partnerId,
        amount: totalPrice,
        checkIn,
        checkOut,
        paymentMode: "razorpay",
      };

      console.log("Creating booking (client) payload:", payload);

      const res = await fetch("/api/bookings", {
        method: "POST",
        credentials: "include", // critical: sends __session cookie to server
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        console.error("Invalid JSON from /api/bookings:", text);
        alert("Server error while creating booking.");
        setSubmitting(false);
        return;
      }

      if (!res.ok) {
        console.error("Booking API failed:", data);
        alert("Failed to create booking: " + (data.error || JSON.stringify(data)));
        setSubmitting(false);
        return;
      }

      if (!data.success) {
        alert(data.error || "Booking creation failed.");
        setSubmitting(false);
        return;
      }

      // If server returned a Razorpay order id — open checkout
      const rzpOrderId = data.razorpayOrderId;
      if (payload.paymentMode === "razorpay" && rzpOrderId) {
        openRazorpayCheckout({
          amount: Number(payload.amount),
          orderId: rzpOrderId,
          name: listing.name || "BHARATCOMFORT11",
          email: user.email || "",
          phone: (user.phoneNumber as string) || "",
          onSuccess: (resp) => {
            console.log("Razorpay success:", resp);
            // You may want to verify payment server-side, or navigate to booking details
            router.push(`/listing/${listing.id}/booking-confirmed?bookingId=${data.bookingId}`);
          },
          onFailure: (err) => {
            console.error("Razorpay failed or cancelled:", err);
            alert("Payment cancelled or failed.");
          },
        });
      } else {
        // pay_at_hotel or no rzp order
        router.push(`/listing/${listing.id}/book?checkIn=${checkIn}&checkOut=${checkOut}`);
      }
    } catch (err) {
      console.error("Booking error:", err);
      alert("Something went wrong while creating booking.");
    } finally {
      setSubmitting(false);
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
        <p className="text-gray-600">
          {listing.category} • {listing.location}
        </p>
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

            {totalPrice > 0 && <p className="font-semibold">Total: ₹{totalPrice}</p>}

            <Button
              onClick={handleBookNow}
              disabled={!checkIn || !checkOut || !!dateError || submitting}
              className="w-full bg-yellow-600 text-white"
            >
              {submitting ? "Processing..." : user ? "Book Now" : "Login to Book"}
            </Button>

            {dateError && <p className="text-red-500 text-sm text-center">{dateError}</p>}
          </div>
        </aside>
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Reviews</h2>
        {reviews.length === 0 ? <p>No reviews yet.</p> : reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
      </section>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => setUser(auth.currentUser)}
      />
    </div>
  );
}
