"use client";

import dynamic from "next/dynamic";
import { memo } from "react";
import type { Listing } from "./ListingCard";

// ✅ Dynamically import ListingCard to reduce hydration load
const ListingCard = dynamic(() => import("./ListingCard"), {
  ssr: false,
  loading: () => (
    <div className="h-72 bg-gray-100 rounded-xl animate-pulse"></div>
  ),
});

interface ListingGridProps {
  listings: Listing[];
}

function ListingGridComponent({ listings }: ListingGridProps) {
  if (!listings || listings.length === 0) {
    return (
      <p className="text-center text-gray-500 py-12">
        No listings available right now.
      </p>
    );
  }

  return (
    <div
      className="
        grid grid-cols-1 
        sm:grid-cols-2 
        lg:grid-cols-3 
        xl:grid-cols-4 
        gap-6 
        p-4
      "
    >
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}

// ✅ Memoized for performance in re-renders
export default memo(ListingGridComponent);
