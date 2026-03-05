"use client";

import dynamic from "next/dynamic";
import { memo } from "react";
import type { Listing } from "./ListingCard";

/* Dynamic import for performance */
const ListingCard = dynamic(() => import("./ListingCard"), {
  ssr: false,
  loading: () => (
    <div className="h-72 bg-gray-100 rounded-xl animate-pulse"></div>
  ),
});

interface ListingGridProps {
  listings: Listing[];
}

/* Skeleton loader grid */
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-72 bg-gray-100 rounded-xl animate-pulse"
        />
      ))}
    </div>
  );
}

function ListingGridComponent({ listings }: ListingGridProps) {

  /* loading fallback */
  if (!listings) {
    return <SkeletonGrid />;
  }

  /* empty state */
  if (listings.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-lg">
          No stays found for your search.
        </p>
        <p className="text-gray-400 text-sm mt-2">
          Try adjusting filters or search location.
        </p>
      </div>
    );
  }

  return (
    <div
      role="grid"
      className="
        grid 
        grid-cols-1
        sm:grid-cols-2
        lg:grid-cols-3
        xl:grid-cols-4
        gap-6
        p-4
      "
    >
      {listings.map((listing) => (
        <ListingCard
          key={listing.id ?? Math.random()}
          listing={listing}
        />
      ))}
    </div>
  );
}

/* Memoized for performance */
export default memo(ListingGridComponent);
