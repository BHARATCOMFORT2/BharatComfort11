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
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";

import ImageGallery from "@/components/ui/ImageGallery";
import ReviewCard from "@/components/reviews/ReviewCard";
import { Button } from "@/components/ui/Button";
import LoginModal from "@/components/auth/LoginModal";

import { openRazorpayCheckout } from "@/lib/payments-razorpay";

/* --------------------------------------------
   TYPES
---------------------------------------------*/

interface Listing {
  id?: string;

  name: string;
  category: string;
  location: string;
  description: string;

  price: number;

  ownerId?: string;
  ownerType?: "partner" | "admin";

  partnerId?: string;

  images?: string[];
  rating?: number;

  unavailableDates?: string[];
}

interface Review {
  id: string;
  user: string;
  rating: number;
  comment: string;
}

/* --------------------------------------------
   COMPONENT
---------------------------------------------*/

export default function ListingDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [listing, setListing] = useState<Listing | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  const [totalNights, setTotalNights] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  const [dateError, setDateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* --------------------------------------------
     AUTH LISTENER
  ---------------------------------------------*/

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  /* --------------------------------------------
     FETCH LISTING
  ---------------------------------------------*/

  useEffect(() => {
    if (!id) return;

    const ref = doc(db, "listings", id as string);

    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Listing;

        setListing({
          id: snap.id,
          ...data,
          unavailableDates: data.unavailableDates || [],
        });
      }

      setLoading(false);
    });

    return () => unsub();
  }, [id]);

  /* --------------------------------------------
     REAL-TIME BOOKED DATES
  ---------------------------------------------*/

  useEffect(() => {
    if (!id) return;

    const q = query(
      collection(db, "bookings"),
      where("listingId", "==", id as string),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const unsub = onSnapshot(q, (snap) => {
      const bookedDates: string[] = [];

      snap.forEach((doc) => {
        const data = doc.data();

        const start = new Date(data.checkIn);
        const end = new Date(data.checkOut);

        const cur = new Date(start);

        while (cur <= end) {
          bookedDates.push(cur.toISOString().split("T")[0]);
          cur.setDate(cur.getDate() + 1);
        }
      });

      setListing((prev) =>
        prev
          ? {
              ...prev,
              unavailableDates: Array.from(new Set(bookedDates)),
            }
          : prev
      );
    });

    return () => unsub();
  }, [id]);

  /* --------------------------------------------
     REVIEWS
  ---------------------------------------------*/

  useEffect(() => {
    if (!id) return;

    const ref = doc(db, "reviews", id as string);

    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setReviews(snap.data().reviews || []);
      } else {
        setReviews([]);
      }
    });

    return () => unsub();
  }, [id]);

  /* --------------------------------------------
     DATE VALIDATION
  ---------------------------------------------*/

  const isUnavailable = (date: string) =>
    listing?.unavailableDates?.includes(date);

  useEffect(() => {
    if (!checkIn || !checkOut || !listing?.price) {
      setTotalPrice(0);
      setTotalNights(0);
      return;
    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);

    if (end <= start) {
      setDateError("Checkout must be after check-in");
      return;
    }

    if (isUnavailable(checkIn) || isUnavailable(checkOut)) {
      setDateError("Selected dates unavailable");
      return;
    }

    const nights = Math.ceil((end.getTime() - start.getTime()) / 86400000);

    setTotalNights(nights);
    setTotalPrice(nights * listing.price);

    setDateError(null);
  }, [checkIn, checkOut, listing]);

  /* --------------------------------------------
     BOOK NOW
  ---------------------------------------------*/

  const handleBookNow = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!listing?.id) {
      alert("Listing not available");
      return;
    }

    if (!checkIn || !checkOut) {
      alert("Select dates");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        listingId: listing.id,

        ownerId: listing.ownerId || listing.partnerId || null,
        ownerType:
          listing.ownerType || (listing.partnerId ? "partner" : "admin"),

        partnerId: listing.partnerId || null,

        amount: totalPrice,

        checkIn,
        checkOut,

        paymentMode: "razorpay",
      };

      const res = await fetch("/api/bookings", {
        method: "POST",
        credentials: "include",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Booking failed");
        return;
      }

      const orderId = data.razorpayOrderId;

      if (orderId) {
        openRazorpayCheckout({
          orderId,
          amount: payload.amount,

          name: listing.name,
          email: user.email || "",
          phone: user.phoneNumber || "",

          onSuccess: () => {
            router.push(
              `/listing/${listing.id}/booking-confirmed?bookingId=${data.bookingId}`
            );
          },

          onFailure: () => {
            alert("Payment cancelled");
          },
        });
      }
    } catch (err) {
      console.error(err);
      alert("Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* --------------------------------------------
     UI
  ---------------------------------------------*/

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  if (!listing) return <div>Listing not found</div>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold">{listing.name}</h1>

      <p className="text-gray-600">
        {listing.category} • {listing.location}
      </p>

      <p className="font-semibold mt-2">₹{listing.price}/night</p>

      {listing.images && <ImageGallery images={listing.images} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-2">About</h2>

          <p>{listing.description}</p>
        </div>

        <aside className="p-6 border rounded-lg shadow sticky top-24">
          <h3 className="text-lg font-bold mb-4">Booking</h3>

          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="border p-2 w-full mb-2"
          />

          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="border p-2 w-full mb-4"
          />

          {totalPrice > 0 && (
            <p className="font-semibold">Total ₹{totalPrice}</p>
          )}

          <Button
            onClick={handleBookNow}
            disabled={!checkIn || !checkOut || submitting}
            className="w-full bg-yellow-600 text-white"
          >
            {user ? "Book Now" : "Login to Book"}
          </Button>

          {dateError && <p className="text-red-500">{dateError}</p>}
        </aside>
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Reviews</h2>

        {reviews.length === 0 ? (
          <p>No reviews yet</p>
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
