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
import { db, auth } from "@/lib/firebase";
import ListingFilters from "@/components/listings/ListingFilters";
import nextDynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { openRazorpayCheckout } from "@/lib/payments-razorpay";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import LoginModal from "@/components/auth/LoginModal";

const ListingMap = nextDynamic(() => import("@/components/listings/ListingMap"), {
  ssr: false,
});

export const dynamic = "force-dynamic";

/* ---------------------------------------------------
   📦 Listing Interface
--------------------------------------------------- */
interface Listing {
  id: string;
  name: string;
  location: string;
  price: number;
  images?: string[];
  image?: string;
  category?: string;
  rating?: number;
  lat?: number;
  lng?: number;
}

/* ---------------------------------------------------
   📄 Main Page
--------------------------------------------------- */
export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    category: "all",
    minPrice: 0,
    maxPrice: 10000,
    location: "",
    rating: 0,
  });

  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const router = useRouter();
  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  /* ---------------------------------------------------
     👤 Auth Listener
  --------------------------------------------------- */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsub();
  }, []);

  /* ---------------------------------------------------
     ⏱ Debounce Filters
  --------------------------------------------------- */
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilters(filters), 400);
    return () => clearTimeout(timer);
  }, [filters]);

  /* ---------------------------------------------------
     🔁 Load Listings
  --------------------------------------------------- */
  const loadListings = useCallback(
    async (reset = false) => {
      if (loading || (!hasMore && !reset)) return;
      setLoading(true);

      try {
        const colRef = collection(db, "listings");
        const conditions: any[] = [];

        // ✅ If your DB has status field:
        // conditions.push(where("status", "==", "approved"));

        if (filters.category !== "all")
          conditions.push(where("category", "==", filters.category));
        if (filters.minPrice > 0)
          conditions.push(where("price", ">=", filters.minPrice));
        if (filters.maxPrice < 10000)
          conditions.push(where("price", "<=", filters.maxPrice));

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

        // 🛑 Prevent infinite loop if no results
        if (snap.empty) {
          setHasMore(false);
          setLoading(false);
          return;
        }

        const newListings = snap.docs.map((doc) => {
          const data = doc.data() as Listing;
          const images =
            Array.isArray(data.images) && data.images.length > 0
              ? data.images
              : [data.image || "https://via.placeholder.com/400x300?text=No+Image"];
          return { id: doc.id, ...data, images };
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
     🔄 Infinite Scroll
  --------------------------------------------------- */
  useEffect(() => {
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) loadListings(false);
      },
      { threshold: 1 }
    );

    if (loadMoreRef.current) observer.current.observe(loadMoreRef.current);
    return () => observer.current?.disconnect();
  }, [loadListings, hasMore, loading]);

  /* ---------------------------------------------------
     🔍 Reload on Filter Change
  --------------------------------------------------- */
  useEffect(() => {
    setLastDoc(null);
    setHasMore(true);
    loadListings(true);
  }, [debouncedFilters]);

  /* ---------------------------------------------------
     💳 Book Now Handler
  --------------------------------------------------- */
  const handleBookNow = async (listing: Listing) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: listing.price,
          listingId: listing.id,
          userId: user.uid,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to create order");

      openRazorpayCheckout({
        amount: listing.price,
        orderId: data.id,
        name: listing.name,
        email: user.email,
        phone: user.phoneNumber || "9999999999",
        onSuccess: () => alert("✅ Payment Successful!"),
        onFailure: () => alert("❌ Payment Failed"),
      });
    } catch (err) {
      console.error("Booking error:", err);
      alert("Failed to start payment.");
    }
  };

  /* ---------------------------------------------------
     🧱 Listing Card
  --------------------------------------------------- */
  const ListingCard = ({ listing }: { listing: Listing }) => {
    const [current, setCurrent] = useState(0);

    useEffect(() => {
      const timer = setInterval(
        () => setCurrent((prev) => (prev + 1) % listing.images!.length),
        2500
      );
      return () => clearInterval(timer);
    }, [listing.images]);

    return (
      <div className="border rounded-xl shadow hover:shadow-xl bg-white overflow-hidden transition-all duration-300">
        <div className="relative w-full h-52 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img
              key={listing.images?.[current]}
              src={listing.images?.[current]}
              alt={listing.name}
              loading="lazy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
            {listing.images?.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i === current ? "bg-yellow-500" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="p-4 space-y-2">
          <h3 className="text-lg font-semibold text-gray-800 truncate">
            {listing.name}
          </h3>
          <p className="text-gray-600 text-sm truncate">{listing.location}</p>
          <div className="flex justify-between items-center">
            <span className="text-blue-600 font-bold">₹{listing.price}</span>
            <span className="text-yellow-600 text-sm">
              ⭐ {listing.rating || 4.2}
            </span>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => router.push(`/listing/${listing.id}`)}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800"
            >
              Visit
            </Button>
            <Button
              onClick={() => handleBookNow(listing)}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Book Now
            </Button>
          </div>
        </div>
      </div>
    );
  };

  /* ---------------------------------------------------
     🖼️ Page UI
  --------------------------------------------------- */
  return (
    <div className="p-6 space-y-8">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold text-gray-800">Available Listings</h1>
        <span className="text-sm text-gray-500">
          Showing {listings.length} place{listings.length !== 1 ? "s" : ""}
        </span>
      </header>

      <ListingFilters
        filters={filters}
        setFilters={setFilters}
        onSearch={(value) => setFilters((prev) => ({ ...prev, search: value }))}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      <div ref={loadMoreRef} className="py-8 text-center text-gray-500">
        {!loading && listings.length === 0
          ? "No listings found."
          : loading
          ? "Loading more listings..."
          : hasMore
          ? "Scroll down to load more"
          : "🎉 You've reached the end"}
      </div>

      {listings.length > 0 && (
        <section className="pt-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Explore on Map
          </h2>
          <div className="w-full h-[400px] rounded-lg overflow-hidden shadow">
            <ListingMap listings={listings} />
          </div>
        </section>
      )}

      {/* 🧩 Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
}
