"use client";

import { useState } from "react";
import ListingFilters from "@/components/listings/ListingFilters";
import ListingCard from "@/components/listings/ListingCard";
import ListingMap from "@/components/listings/ListingMap";

export default function ListingsPage() {
  // Mock data — later this will come from Firestore
  const [listings] = useState([
    {
      id: "1",
      name: "Taj Hotel",
      category: "Hotel",
      location: "Mumbai, India",
      price: "₹8,500/night",
      rating: 4.7,
      image: "/images/sample-hotel.jpg",
    },
    {
      id: "2",
      name: "Royal Dine",
      category: "Restaurant",
      location: "Delhi, India",
      price: "₹1,200 avg",
      rating: 4.5,
      image: "/images/sample-restaurant.jpg",
    },
    {
      id: "3",
      name: "Goa Beach Escape",
      category: "Travel Package",
      location: "Goa, India",
      price: "₹25,000 / 3N 4D",
      rating: 4.8,
      image: "/images/sample-travel.jpg",
    },
  ]);

  return (
    <div className="container mx-auto px-4 py-12 flex flex-col lg:flex-row gap-8">
      {/* Filters Sidebar */}
      <aside className="w-full lg:w-1/4">
        <ListingFilters />
      </aside>

      {/* Listings + Map */}
      <section className="w-full lg:w-3/4 flex flex-col gap-8">
        {/* Listings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>

        {/* Map Section */}
        <div className="w-full h-[400px]">
          <ListingMap listings={listings} />
        </div>
      </section>
    </div>
  );
}
