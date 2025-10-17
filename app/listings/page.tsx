"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ListingGrid from "@/components/listings/ListingGrid";
import { Listing } from "@/components/listings/ListingCard";
import nextDynamic from "next/dynamic"; // ✅ dynamic import for map

// ✅ Dynamically import Leaflet-based map so it only renders client-side
const ListingMap = nextDynamic(() => import("@/components/listings/ListingMap"), {
  ssr: false,
});

// ✅ Disable SSR on Netlify build
export const dynamic = "force-dynamic";

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Real-time Firestore listener for approved listings
  useEffect(() => {
    try {
      const q = query(
        collection(db, "listings"),
        where("status", "==", "approved"),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Listing),
          }));
          setListings(data);
          setLoading(false);
        },
        (error) => {
          console.error("❌ Firestore listener error:", error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up listener:", err);
      setLoading(false);
    }
  }, []);

  if (loading)
    return (
      <p className="p-6 text-gray-500 animate-pulse">Loading listings...</p>
    );

  if (listings.length === 0)
    return (
      <p className="p-6 text-gray-600">
        No approved listings available yet. Please check back later.
      </p>
    );

  return (
    <div className="p-6 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">
          Available Listings
        </h1>
        <span className="text-sm text-gray-500">
          Showing {listings.length} places
        </span>
      </header>

      {/* Grid Section */}
      <ListingGrid listings={listings} />

      {/* Map Section */}
      <section className="pt-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Explore on Map
        </h2>
        <div className="w-full h-[400px] rounded-lg overflow-hidden shadow">
          <ListingMap listings={listings} />
        </div>
      </section>
    </div>
  );
}
