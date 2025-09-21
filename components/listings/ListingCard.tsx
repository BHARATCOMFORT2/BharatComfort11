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
}

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  return (
    <div className="border rounded-lg shadow hover:shadow-lg transition p-4 bg-white">
      <Image
        src={listing.image}
        alt={listing.name}
        width={400}
        height={250}
        className="rounded-lg mb-3 object-cover"
      />
      <h2 className="text-lg font-semibold">{listing.name}</h2>
      <p className="text-gray-600">{listing.location}</p>
      <p className="text-sm text-gray-500">{listing.category}</p>
      <p className="mt-2 font-bold text-blue-600">₹{listing.price}</p>
      <p className="text-yellow-600 text-sm">⭐ {listing.rating}</p>
    </div>
  );
}
