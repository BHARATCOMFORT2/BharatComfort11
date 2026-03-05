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

export const dynamic = "force-dynamic";

const ListingMap = nextDynamic(
  () => import("@/components/listings/ListingMap"),
  { ssr: false }
);

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

  /* Auth Listener */
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

  /* Debounce Filters */
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilters(filters), 400);
    return () => clearTimeout(timer);
  }, [filters]);

  /* Client Filters */
  const applyClientFilters = useCallback(
    (items: any[]) => {
      const f = debouncedFilters;

      const search = f.search.trim().toLowerCase();
      const locationSearch = f.location.trim().toLowerCase();

      return items.filter((item) => {
        const title = (item.title || "").toLowerCase();
        const location = (item.location || "").toLowerCase();
        const price = Number(item.price || 0);
        const rating = Number(item.rating || 0);

        if (search && !title.includes(search) && !location.includes(search))
          return false;

        if (locationSearch && !location.includes(locationSearch))
          return false;

        if (f.category !== "all" && item.category !== f.category)
          return false;

        if (price < f.minPrice || price > f.maxPrice)
          return false;

        if (f.rating && rating < f.rating)
          return false;

        if (f.onlyPayAtHotel && !item.allowPayAtHotel)
          return false;

        return true;
      });
    },
    [debouncedFilters]
  );

  /* Load Listings */
  const loadListings = useCallback(
    async (reset = false) => {
      if (loading) return;

      setLoading(true);

      try {
        if (reset) {
          setLastDoc(null);
          setHasMore(true);
        }

        const colRef = collection(db, "listings");

        let q = query(
          colRef,
          where("status", "in", ["approved", "active"]),
          orderBy("createdAt", "desc"),
          limit(9)
        );

        if (!reset && lastDoc) {
          q = query(
            colRef,
            where("status", "in", ["approved", "active"]),
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

        let newListings = snap.docs.map((doc) => {
          const data: any = doc.data();

          return {
            id: doc.id,
            ...data,
            title: data.title || data.name || "Untitled stay",
            location: data.location || "",
            images:
              Array.isArray(data.images) && data.images.length
                ? data.images
                : [data.image || "https://via.placeholder.com/400x300"],
            featured: Boolean(data.featured),
            createdAt: data.createdAt,
          };
        });

        newListings = applyClientFilters(newListings);

        newListings.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        });

        setLastDoc(snap.docs[snap.docs.length - 1]);

        setListings((prev) =>
          reset ? newListings : [...prev, ...newListings]
        );

        setHasMore(snap.docs.length === 9);
      } catch (err) {
        console.error("Error loading listings:", err);
      }

      setLoading(false);
    },
    [applyClientFilters, lastDoc, loading]
  );

  /* Infinite Scroll */
  useEffect(() => {
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadListings(false);
        }
      },
      {
        threshold: 0.5,
        rootMargin: "200px",
      }
    );

    if (loadMoreRef.current) {
      observer.current.observe(loadMoreRef.current);
    }

    return () => observer.current?.disconnect();
  }, [loadListings, hasMore, loading]);

  useEffect(() => {
    loadListings(true);
  }, [debouncedFilters]);

  /* Booking */
  const handleBookNow = async (listing: any) => {
    if (!user) {
      setPendingListing(listing);
      setShowLoginModal(true);
      return;
    }

    try {
      const token = await getFirebaseIdToken();

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listingId: listing.id,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "Booking failed");
        return;
      }

      toast.info("Redirecting to payment");

      await openRazorpayCheckout({
        amount: data.razorpayOrder.amount,
        orderId: data.razorpayOrder.id,
        name: listing.title,
        email: user.email,
        phone: user.phoneNumber || "",
        onSuccess: () => toast.success("Payment successful"),
        onFailure: () => toast.error("Payment failed"),
      });
    } catch (err) {
      console.error(err);
      toast.error("Booking error");
    }
  };

  /* Listing Card */
  const ListingCard = ({ listing }: any) => {
    const [current, setCurrent] = useState(0);

    useEffect(() => {
      if (!listing.images?.length) return;

      const timer = setInterval(() => {
        setCurrent((prev) => (prev + 1) % listing.images.length);
      }, 3000);

      return () => clearInterval(timer);
    }, [listing.images]);

    const safeImages =
      listing.images?.length > 0
        ? listing.images
        : ["https://via.placeholder.com/400x300"];

    return (
      <div className="border rounded-xl shadow bg-white overflow-hidden hover:shadow-xl transition">
        <div className="relative w-full h-52">
          <AnimatePresence mode="wait">
            <motion.img
              key={safeImages[current]}
              src={safeImages[current]}
              alt={listing.title}
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          </AnimatePresence>
        </div>

        <div className="p-4 space-y-2">
          <h3 className="text-lg font-semibold">{listing.title}</h3>
          <p className="text-gray-600 text-sm">{listing.location}</p>

          <div className="flex justify-between items-center">
            <span className="text-blue-600 font-bold">
              ₹{listing.price}
            </span>

            <span className="text-yellow-600 text-sm">
              ⭐ {listing.rating || 4.2}
            </span>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => router.push(`/listing/${listing.id}`)}
              className="flex-1 bg-gray-200 hover:bg-gray-300"
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

  return (
    <div className="p-6 space-y-8">
      <ListingFilters filters={filters} setFilters={setFilters} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      <div ref={loadMoreRef} className="py-8 text-center text-gray-500">
        {loading
          ? "Loading more listings..."
          : hasMore
          ? "Scroll to load more"
          : "🎉 End of listings"}
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => setUser(auth.currentUser)}
      />
    </div>
  );
}
