"use client";

import { useParams } from "next/navigation";
import ImageGallery from "@/components/ui/ImageGallery";
import BookingForm from "@/components/forms/BookingForm";
import ReviewCard from "@/components/reviews/ReviewCard";

export default function ListingDetailsPage() {
  const { id } = useParams();

  // Temporary mock listing (replace with Firestore query later)
  const listing = {
    id,
    name: "Taj Hotel Mumbai",
    category: "Hotel",
    location: "Mumbai, India",
    description:
      "Experience luxury at its finest at the Taj Hotel in Mumbai. With world-class amenities, fine dining, and a stunning sea view, your stay will be unforgettable.",
    price: "₹8,500/night",
    rating: 4.7,
    images: [
      "/images/sample-hotel.jpg",
      "/images/sample-hotel-2.jpg",
      "/images/sample-hotel-3.jpg",
    ],
    reviews: [
      {
        id: "r1",
        user: "Ananya Sharma",
        rating: 5,
        comment: "Absolutely loved the stay! Service was excellent 🌟",
      },
      {
        id: "r2",
        user: "Rahul Mehta",
        rating: 4,
        comment: "Great location and staff. Rooms could be bigger.",
      },
    ],
  };

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Title + Rating */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold">{listing.name}</h1>
        <p className="text-gray-600">
          {listing.category} • {listing.location}
        </p>
        <p className="mt-2 text-lg font-semibold">{listing.price}</p>
        <p className="text-yellow-500">⭐ {listing.rating}</p>
      </header>

      {/* Image Gallery */}
      <section className="mb-12">
        <ImageGallery images={listing.images} />
      </section>

      {/* Description + Booking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Details */}
        <article className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">About</h2>
          <p className="text-gray-700">{listing.description}</p>
        </article>

        {/* Right: Booking Form */}
        <aside className="border rounded-lg shadow p-6 bg-white">
          <h3 className="text-lg font-semibold mb-4">Book Now</h3>
          <BookingForm listingId={listing.id as string} />
        </aside>
      </div>

      {/* Reviews */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-6">Guest Reviews</h2>
        <div className="space-y-4">
          {listing.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      </section>
    </div>
  );
}
