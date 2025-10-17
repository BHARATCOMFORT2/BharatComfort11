"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore"; // ✅ real-time Firestore listener
import ImageGallery from "@/components/ui/ImageGallery";
import BookingForm from "@/components/forms/BookingForm";
import ReviewCard from "@/components/reviews/ReviewCard";

interface Listing {
  id: string;
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
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);

  // ✅ Real-time listener for listing details
  useEffect(() => {
    if (!id) return;
    const ref = doc(db, "listings", id as string);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setListing({ id: snap.id, ...(snap.data() as Listing) });
        } else {
          setListing(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("❌ Error fetching listing:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [id]);

  // ✅ (Optional) Real-time reviews
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

  if (loading)
    return <div className="text-center py-12 text-gray-600">Loading listing...</div>;

  if (!listing)
    return (
      <div className="text-center py-12 text-gray-600">
        Listing not found or may have been removed.
      </div>
    );

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Title + Rating */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold">{listing.name}</h1>
        <p className="text-gray-600">
          {listing.category} • {listing.location}
        </p>
        <p className="mt-2 text-lg font-semibold">
          ₹{listing.price?.toLocaleString()}/night
        </p>
        {listing.rating && (
          <p className="text-yellow-500">⭐ {listing.rating.toFixed(1)}</p>
        )}
      </header>

      {/* Image Gallery */}
      {listing.images && listing.images.length > 0 && (
        <section className="mb-12">
          <ImageGallery images={listing.images} />
        </section>
      )}

      {/* Description + Booking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Details */}
        <article className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">About</h2>
          <p className="text-gray-700 leading-relaxed">{listing.description}</p>
        </article>

        {/* Right: Booking Form */}
        <aside className="border rounded-lg shadow p-6 bg-white">
          <h3 className="text-lg font-semibold mb-4">Book Now</h3>
          <BookingForm listingId={listing.id} />
        </aside>
      </div>

      {/* Reviews */}
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
    </div>
  );
}
