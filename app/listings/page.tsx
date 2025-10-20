"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import ListingGrid from "@/components/listings/ListingGrid";
import { Listing } from "@/components/listings/ListingCard";
import nextDynamic from "next/dynamic";

// ✅ Dynamic import (avoids SSR issues with Leaflet)
const ListingMap = nextDynamic(() => import("@/components/listings/ListingMap"), {
  ssr: false,
});

export const dynamic = "force-dynamic";

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupListener = async () => {
      try {
        // ✅ Fetch only approved listings, sorted by creation date
        const q = query(
          collection(db, "listings"),
          where("status", "==", "approved"),
          orderBy("createdAt", "desc")
        );

        unsubscribe = onSnapshot(
          q,
          (snapshot: QuerySnapshot<DocumentData>) => {
            const parsed: Listing[] = snapshot.docs.map((doc) => {
              const raw = doc.data() as Listing;

              // ✅ Remove any duplicate `id` from Firestore data
              const { id: _existingId, ...data } = raw;

              // ✅ Ensure valid coordinates for map rendering
              if (typeof data.lat !== "number" || typeof data.lng !== "number") {
                data.lat = 20.5937; // Default to India's center
                data.lng = 78.9629;
              }

              return { id: doc.id, ...data };
            });

            setListings(parsed);
            setLoading(false);
          },
          (error) => {
            console.error("❌ Firestore listener error:", error);

            // 🔁 Fallback query if index is missing
            if (error.code === "failed-precondition") {
              const q2 = query(collection(db, "listings"), where("status", "==", "approved"));
              onSnapshot(q2, (snap) => {
                const fallback = snap.docs.map((doc) => {
                  const raw = doc.data() as Listing;
                  const { id: _existingId, ...data } = raw;

                  if (typeof data.lat !== "number" || typeof data.lng !== "number") {
                    data.lat = 20.5937;
                    data.lng = 78.9629;
                  }

                  return { id: doc.id, ...data };
                });

                setListings(fallback);
                setLoading(false);
              });
            } else {
              setLoading(false);
            }
          }
        );
      } catch (err) {
        console.error("🔥 Error setting up Firestore listener:", err);
        setLoading(false);
      }
    };

    setupListener();
    return () => unsubscribe && unsubscribe();
  }, []);

  // ------------------- UI States -------------------

  if (loading) {
    return <p className="p-6 text-gray-500 animate-pulse">Loading listings...</p>;
  }

  if (listings.length === 0) {
    return (
      <p className="p-6 text-gray-600">
        No approved listings available yet. Please check back later.
      </p>
    );
  }

  // ------------------- Render Page -------------------

  return (
    <div className="p-6 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Available Listings</h1>
        <span className="text-sm text-gray-500">
          Showing {listings.length} places
        </span>
      </header>

      {/* 🧱 Grid Section */}
      <ListingGrid listings={listings} />

      {/* 🗺️ Map Section */}
      <section className="pt-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Explore on Map</h2>
        <div className="w-full h-[400px] rounded-lg overflow-hidden shadow">
          <ListingMap listings={listings} />
        </div>
      </section>
    </div>
  );
}
