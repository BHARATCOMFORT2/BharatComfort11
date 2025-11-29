"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { openRazorpayCheckout } from "@/lib/payments-razorpay";
import LoginModal from "@/components/auth/LoginModal";

/* ------------------------------------------
   ✅ SAMPLE FALLBACK DATA (ALWAYS AVAILABLE)
------------------------------------------- */
const SAMPLE_FEATURED = [
  {
    id: "SF1",
    name: "Sea View Resort",
    location: "Goa",
    price: 3499,
    rating: 4.6,
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945",
    ],
    category: "resort",
    featured: true,
  },
  {
    id: "SF2",
    name: "Snow Valley Hotel",
    location: "Manali",
    price: 2799,
    rating: 4.4,
    images: [
      "https://images.unsplash.com/photo-1505692952047-1a78307da8f2",
    ],
    category: "hotel",
    featured: true,
  },
  {
    id: "SF3",
    name: "Royal Palace Stay",
    location: "Jaipur",
    price: 3999,
    rating: 4.7,
    images: [
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b",
    ],
    category: "hotel",
    featured: true,
  },
];

/* ------------------------------------------
   🕐 Debounce Hook
------------------------------------------- */
function useDebounce<T>(value: T, delay: number): [T] {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return [debounced];
}

/* ------------------------------------------
   🧩 Listing Type
------------------------------------------- */
interface Listing {
  id: string;
  name: string;
  location?: string;
  price?: number;
  rating?: number;
  images: string[];
  category?: string;
  featured?: boolean;
}

/* ------------------------------------------
   🌟 Featured Listings Component
------------------------------------------- */
export default function FeaturedListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingListing, setPendingListing] = useState<Listing | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

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

  /* 🔥 Fetch REAL Featured Listings */
  useEffect(() => {
    const q = query(
      collection(db, "listings"),
      where("featured", "==", true),
      orderBy("createdAt", "desc"),
      limit(12)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Listing[] = snap.docs.map((doc) => {
          const data = doc.data();
          const images =
            Array.isArray(data.images) && data.images.length > 0
              ? data.images
              : [data.image || "https://via.placeholder.com/400x300?text=No+Image"];

          return {
            id: doc.id,
            name: data.name || "Unnamed Listing",
            location: data.location || "Unknown",
            price: data.price || 0,
            rating: data.rating || 4.2,
            images,
            category: data.category || "General",
            featured: data.featured || false,
          };
        });

        // ✅ REAL > SAMPLE (Fallback Logic)
        if (list.length > 0) {
          setListings(list);
        } else {
          setListings(SAMPLE_FEATURED);
        }

        setLoading(false);
      },
      (err) => {
        console.error("❌ Featured listings error:", err);
        // ✅ On Error → Use Sample
        setListings(SAMPLE_FEATURED);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  /* 🔍 Search Filter */
  const filtered = debouncedSearch
    ? listings.filter(
        (l) =>
          l.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          l.location?.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : listings;

  /* 💳 Handle Book Now */
  const handleBookNow = useCallback(
    async (listing: Listing) => {
      if (!user) {
        setPendingListing(listing);
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
        if (!data.success)
          throw new Error(data.error || "Failed to create order");

        openRazorpayCheckout({
          amount: listing.price!,
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
    },
    [user]
  );

  /* 🎡 Manual Scroll */
  const scrollLeft = () =>
    scrollRef.current?.scrollBy({ left: -350, behavior: "smooth" });
  const scrollRight = () =>
    scrollRef.current?.scrollBy({ left: 350, behavior: "smooth" });

  /* 🚗 Auto Scroll */
  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    let frame: number;
    const speed = 0.6;

    const scroll = () => {
      if (!isHovered) {
        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) {
          el.scrollTo({ left: 0 });
        } else {
          el.scrollLeft += speed;
        }
      }
      frame = requestAnimationFrame(scroll);
    };

    frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [isHovered]);

  /* 🧠 Loading + Empty */
  if (loading) {
    return (
      <section className="py-10 px-4 text-center text-gray-500 animate-pulse">
        Loading featured listings...
      </section>
    );
  }

  if (filtered.length === 0) return null;

  /* 🎨 Render */
  return (
    <section className="py-12 px-6 bg-gray-50 relative">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-2xl font-bold text-gray-800">
            🌟 Featured Listings
          </h2>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search by name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
            <Button
              onClick={() => router.push("/listings")}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2"
            >
              View All
            </Button>
          </div>
        </div>

        <div
          className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={() => setIsHovered(true)}
          onTouchEnd={() => setIsHovered(false)}
        >
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white shadow-md rounded-full w-10 h-10 flex items-center justify-center hover:bg-yellow-100 z-10"
          >
            ◀
          </button>

          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white shadow-md rounded-full w-10 h-10 flex items-center justify-center hover:bg-yellow-100 z-10"
          >
            ▶
          </button>

          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto scrollbar-hide py-4 px-2 scroll-smooth"
          >
            {filtered.map((listing) => (
              <div
                key={listing.id}
                className="flex-shrink-0 w-80 bg-white shadow-md rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                <div
                  className="relative w-full h-48 cursor-pointer"
                  onClick={() => router.push(`/listing/${listing.id}`)}
                >
                  <Image
                    src={listing.images[0]}
                    alt={listing.name}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="text-lg font-semibold text-gray-800 truncate">
                    {listing.name}
                  </h3>
                  <p className="text-gray-600 text-sm truncate">
                    {listing.location}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-600 font-bold">
                      ₹{listing.price}
                    </span>
                    <span className="text-yellow-600 text-sm">
                      ⭐ {listing.rating}
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
            ))}
          </div>
        </div>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => setUser(auth.currentUser)}
      />
    </section>
  );
}
