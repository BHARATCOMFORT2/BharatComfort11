"use client";

import ListingCard from "./ListingCard";

type Listing = {
  id: string;
  title: string;
  image: string;
  location: string;
  price?: string;
};

type ListingGridProps = {
  listings: Listing[];
};

export default function ListingGrid({ listings }: ListingGridProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard key={listing.id} {...listing} />
      ))}
    </div>
  );
}
