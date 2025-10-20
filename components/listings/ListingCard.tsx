"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { openRazorpayCheckout } from "@/lib/payments-razorpay";

export interface Listing {
  id: string;
  name: string;
  category: string;
  location: string;
  price: string | number;
  rating: number;
  image?: string;
  lat?: number;
  lng?: number;
  partnerId?: string;
  ownerId?: string;
}

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  /** 🔗 Navigate to full details page */
  const handleViewDetails = () => {
    router.push(`/listing/${listing.id}`);
  };

  /** 💳 Start Razorpay checkout */
  const handleBookNow = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(listing.price) || 500,
          listingId: listing.id,
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Failed to create order");

      // ✅ Open Razorpay checkout
      openRazorpayCheckout({
        amount: Number(listing.price) || 500,
        orderId: data.id,
        name: listing.name,
        email: "guest@example.com", // Replace later with logged-in user's email
        phone: "9999999999",
        onSuccess: (res) => {
          alert(`✅ Payment successful: ${res.razorpay_payment_id}`);
        },
        onFailure: (err) => {
          console.error("❌ Payment failed:", err);
          alert("Payment failed or cancelled");
        },
      });
    } catch (err) {
      console.error("❌ Booking failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="border rounded-xl shadow-md hover:shadow-lg transition-all duration-200 bg-white p-4 flex flex-col justify-between"
    >
      {/* 🖼️ Image */}
      <div
        className="relative w-full h-48 mb-3 cursor-pointer"
        onClick={handleViewDetails}
      >
        <Image
          src={
            listing.image ||
            "https://via.placeholder.com/400x300?text=No+Image+Available"
          }
          alt={listing.name}
          fill
          className="rounded-lg object-cover"
        />
      </div>

      {/* 🏕️ Details */}
      <div onClick={handleViewDetails} className="cursor-pointer flex-grow">
        <h2 className="text-lg font-semibold text-gray-800 hover:text-yellow-700">
          {listing.name}
        </h2>
        <p className="text-gray-600 text-sm">{listing.location}</p>
        <p className="text-gray-500 text-sm capitalize">{listing.category}</p>

        <div className="flex justify-between items-center mt-3">
          <p className="font-bold text-blue-600">₹{listing.price}</p>
          <p className="text-yellow-600 text-sm">⭐ {listing.rating}</p>
        </div>

        {(listing.partnerId || listing.ownerId) && (
          <p className="mt-2 text-xs text-gray-400">
            Owner: {listing.partnerId || listing.ownerId}
          </p>
        )}
      </div>

      {/* 💳 Book Now Button */}
      <button
        onClick={handleBookNow}
        disabled={loading}
        className="mt-4 w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-lg font-medium transition disabled:opacity-60"
      >
        {loading ? "Processing..." : "Book Now"}
      </button>
    </div>
  );
}
