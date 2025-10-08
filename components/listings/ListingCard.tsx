"use client";

import Image from "next/image";

export interface Listing {
  id: string;
  name: string;
  category: string;
  location: string;
  price: string;
  rating: number;
  image: string;
  lat: number;
  lng: number;
  partnerId?: string; // ✅ Added for partner-owned listings
  ownerId?: string;   // ✅ Added for admin or system-created listings
}

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  return (
    <div className="border rounded-xl shadow-md hover:shadow-lg transition-all duration-200 bg-white p-4">
      <Image
        src={listing.image}
        alt={listing.name}
        width={400}
        height={250}
        className="rounded-lg mb-3 object-cover w-full h-48"
      />

      <h2 className="text-lg font-semibold text-gray-800">{listing.name}</h2>
      <p className="text-gray-600 text-sm">{listing.location}</p>
      <p className="text-gray-500 text-sm capitalize">{listing.category}</p>

      <div className="flex justify-between items-center mt-3">
        <p className="font-bold text-blue-600">₹{listing.price}</p>
        <p className="text-yellow-600 text-sm">⭐ {listing.rating}</p>
      </div>

      {/* Optional owner/partner display for admin side */}
      {(listing.partnerId || listing.ownerId) && (
        <p className="mt-2 text-xs text-gray-400">
          Owner: {listing.partnerId || listing.ownerId}
        </p>
      )}
    </div>
  );
}
