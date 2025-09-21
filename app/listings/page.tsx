"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ListingGrid from "@/components/listings/ListingGrid";
import ListingMap from "@/components/listings/ListingMap";
import { Listing } from "@/components/listings/ListingCard";

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

   useEffect(() => {
    const fetchListings = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "listings"));
        const data = querySnapshot.docs.map((doc) => {
          const rawData = doc.data() as Omit<Listing, "id">;
          return {
            id: doc.id, // ✅ only here
            ...rawData, // ✅ no duplicate id now
          };
        });
        setListings(data);
      } catch (error) {
        console.error("Error fetching listings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  if (loading) {
    return <p className="p-6">Loading listings...</p>;
  }

  if (listings.length === 0) {
    return <p className="p-6">No listings available.</p>;
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Available Listings</h1>

      {/* Grid Section */}
      <ListingGrid listings={listings} />

      {/* Map Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Explore on Map</h2>
        <div className="w-full h-[400px]">
          <ListingMap listings={listings} />
        </div>
      </section>
    </div>
  );
}
