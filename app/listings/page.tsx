"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import ListingGrid from "@/components/listings/ListingGrid";
import ListingFilters from "@/components/listings/ListingFilters";
import { Listing } from "@/components/listings/ListingCard";
import nextDynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "use-debounce";

// ✅ Avoid SSR issues with Leaflet map
const ListingMap = nextDynamic(() => import("@/components/listings/ListingMap"), {
  ssr: false,
});

export const dynamic = "force-dynamic";

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  // 🧭 Filters
  const [filters, setFilters] = useState({
    search: "",
    category: "all",
    minPrice: 0,
    maxPrice: 10000,
    location: "",
    rating: 0,
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const [debouncedFilters] = useDebounce(filters, 400);
  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  /* ---------------------------------------------------
     🔁 Load listings (with filters & pagination)
  --------------------------------------------------- */
  const loadListings = useCallback(
    async (reset = false) => {
      if (loading || (!hasMore && !reset)) return;
      setLoading(true);

      try {
        const colRef = collection(db, "listings");
        const conditions: any[] = [where("status", "==", "approved")];

        if (filters.category !== "all") {
          conditions.push(where("category", "==", filters.category));
        }
        if (filters.location.trim() !== "") {
          conditions.push(where("location", ">=", filters.location));
          conditions.push(where("location", "<=", filters.location + "\uf8ff"));
        }
        if (filters.minPrice > 0) {
          conditions.push(where("price", ">=", filters.minPrice));
        }
        if (filters.maxPrice < 10000) {
          conditions.push(where("price", "<=", filters.maxPrice));
        }

        let q = query(colRef, ...conditions, orderBy("createdAt", "desc"), limit(9));

        if (!reset && lastDoc) {
          q = query(
            colRef,
            ...conditions,
            orderBy("createdAt", "desc"),
            startAfter(lastDoc),
            limit(9)
          );
        }

        const snap = await getDocs(q);

        const newListings = snap.docs.map((doc) => {
          const data = doc.data() as Listing;
          const mainImage =
            Array.isArray((data as any).images) && (data as any).images.length > 0
              ? (data as any).images[0]
              : "/placeholder.jpg";

          return { id: doc.id, ...data, image: mainImage };
        });

        setListings((prev) => (reset ? newListings : [...prev, ...newListings]));
        setLastDoc(snap.docs[snap.docs.length - 1]);
        setHasMore(snap.docs.length === 9);
      } catch (err) {
        console.error("❌ Error loading listings:", err);
      } finally {
        setLoading(false);
      }
    },
    [filters, lastDoc, hasMore, loading]
  );

  /* ---------------------------------------------------
     🎯 Auto-load more when scrolled to bottom
  --------------------------------------------------- */
  useEffect(() => {
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadListings(false);
        }
      },
      { threshold: 1 }
    );

    if (loadMoreRef.current) observer.current.observe(loadMoreRef.current);

    return () => observer.current?.disconnect();
  }, [loadListings, hasMore, loading]);

  /* ---------------------------------------------------
     🔍 Reset on Filter Change
  --------------------------------------------------- */
  useEffect(() => {
    setLastDoc(null);
    setHasMore(true);
    loadListings(true);
  }, [debouncedFilters]);

  /* ---------------------------------------------------
     🌐 Sync Filters → URL Params
  --------------------------------------------------- */
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(debouncedFilters).forEach(([key, value]) => {
      if (value && value !== "all" && value !== 0 && value !== "") {
        params.set(key, String(value));
      }
    });
    router.replace(`/listings?${params.toString()}`);
  }, [debouncedFilters]);

  /* ---------------------------------------------------
     🧠 Handle Search (with debounce)
  --------------------------------------------------- */
  const handleSearch = useCallback((searchValue: string) => {
    setFilters((prev) => ({ ...prev, search: searchValue }));
  }, []);

  /* ---------------------------------------------------
     🖼️ UI States
  --------------------------------------------------- */
  if (loading && listings.length === 0) {
    return <p className="p-6 text-gray-500 animate-pulse">Loading listings...</p>;
  }

  /* ---------------------------------------------------
     🏠 Render Page
  --------------------------------------------------- */
  return (
    <div className="p-6 space-y-8">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold text-gray-800">Available Listings</h1>
        <span className="text-sm text-gray-500">
          Showing {listings.length} place{listings.length !== 1 ? "s" : ""}
        </span>
      </header>

      {/* 🎛️ Filters Section */}
      <ListingFilters filters={filters} setFilters={setFilters} onSearch={handleSearch} />

      {/* 🧱 Listings Grid */}
      <ListingGrid listings={listings} />

      {/* ♾️ Infinite Scroll Loader */}
      <div ref={loadMoreRef} className="py-8 text-center text-gray-500">
        {loading
          ? "Loading more listings..."
          : hasMore
          ? "Scroll down to load more"
          : "🎉 You've reached the end"}
      </div>

      {/* 🗺️ Map Section */}
      {listings.length > 0 && (
        <section className="pt-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Explore on Map</h2>
          <div className="w-full h-[400px] rounded-lg overflow-hidden shadow">
            <ListingMap listings={listings} />
          </div>
        </section>
      )}
    </div>
  );
}
