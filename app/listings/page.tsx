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
import { getFirebaseIdToken } from "@/lib/firebase-auth";
import { openRazorpayCheckout } from "@/lib/payments-razorpay";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import LoginModal from "@/components/auth/LoginModal";

const ListingMap = nextDynamic(() => import("@/components/listings/ListingMap"), {
  ssr: false,
});

export const dynamic = "force-dynamic";

export default function ListingsPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingListing, setPendingListing] = useState<any>(null);

  const [filters, setFilters] = useState({
    search: "",
    category: "all",
    minPrice: 0,
    maxPrice: 10000,
    location: "",
    rating: 0,
    onlyPayAtHotel: false,
  });

  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const router = useRouter();
  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  /* 👤 Auth Listener */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u && pendingListing) {
        handleBookNow(pendingListing);
        setPendingListing(null);
      }
    });
    return () => unsub();
  }, [pendingListing]);

  /* ⏱ Debounce Filters */
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilters(filters), 400);
    return () => clearTimeout(timer);
  }, [filters]);

  /* 🔁 Load Listings */
  const loadListings = useCallback(
    async (reset = false) => {
      if (loading || (!hasMore && !reset)) return;
      setLoading(true);

      try {
        const colRef = collection(db, "listings");
        const conditions: any[] = [];

        if (filters.category !== "all")
          conditions.push(where("category", "==", filters.category));
        if (filters.minPrice > 0)
          conditions.push(where("price", ">=", filters.minPrice));
        if (filters.maxPrice < 10000)
          conditions.push(where("price", "<=", filters.maxPrice));
        if (filters.onlyPayAtHotel)
          conditions.push(where("allowPayAtHotel", "==", true));

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
        if (snap.empty) {
          setHasMore(false);
          setLoading(false);
          return;
        }

        const newListings = snap.docs.map((doc) => {
          const data = doc.data() as any;
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

  /* 🔄 Infinite Scroll */
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

  /* 🔍 Reload on Filter Change */
  useEffect(() => {
    setLastDoc(null);
    setHasMore(true);
    loadListings(true);
  }, [debouncedFilters]);

  /* 💳 Handle Booking */
  const handleBookNow = async (listing: any) => {
    if (!user) {
      setPendingListing(listing);
      setShowLoginModal(true);
      return;
    }

    try {
      const token = await getFirebaseIdToken();
      const mode =
        listing.allowPayAtHotel &&
        confirm("Would you like to Pay at Hotel instead of paying online?")
          ? "pay_at_hotel"
          : "razorpay";

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listingId: listing.id,
          checkIn: new Date().toISOString(),
          checkOut: new Date(Date.now() + 86400000).toISOString(),
          paymentMode: mode,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Booking failed");
        return;
      }

      if (mode === "razorpay") {
        const { razorpayOrder } = data;
        toast.info("Redirecting to Razorpay...");
        await openRazorpayCheckout({
          amount: razorpayOrder.amount,
          orderId: razorpayOrder.id,
          name: listing.name,
          email: user.email,
          phone: user.phoneNumber || "",
          onSuccess: () => toast.success("✅ Payment successful"),
          onFailure: () => toast.error("❌ Payment failed"),
        });
      } else {
        toast.success("Booking confirmed — Pay at Hotel");
      }
    } catch (err) {
      console.error("Booking error:", err);
      toast.error("Booking could not be initiated");
    }
  };

  /* 🧱 Listing Card */
  const ListingCard = ({ listing }: { listing: any }) => {
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
        </div>

        <div className="p-4 space-y-2">
          <h3 className="text-lg font-semibold text-gray-800 truncate">{listing.name}</h3>
          <p className="text-gray-600 text-sm truncate">{listing.location}</p>
          {listing.allowPayAtHotel && (
            <p className="text-green-600 text-xs font-medium">🏨 Pay at Hotel Available</p>
          )}
          <div className="flex justify-between items-center">
            <span className="text-blue-600 font-bold">₹{listing.price}</span>
            <span className="text-yellow-600 text-sm">⭐ {listing.rating || 4.2}</span>
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

  /* 🖼️ Page UI */
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
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Explore on Map</h2>
          <div className="w-full h-[400px] rounded-lg overflow-hidden shadow">
            <ListingMap listings={listings} />
          </div>
        </section>
      )}

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => setUser(auth.currentUser)}
      />
    </div>
  );
}
