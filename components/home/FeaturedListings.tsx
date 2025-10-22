"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { openRazorpayCheckout } from "@/lib/payments-razorpay";
import LoginModal from "@/components/auth/LoginModal";
import { Button } from "@/components/ui/Button";

export default function FeaturedListings() {
  const router = useRouter();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [user, setUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);

  // 🧠 Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // 👤 Auth listener
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsub();
  }, []);

  // 🔥 Real-time Firestore listener
  useEffect(() => {
    const q = query(
      collection(db, "listings"),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const data = snapshot.docs.map((doc) => {
        const raw = doc.data();
        const images =
          Array.isArray(raw.images) && raw.images.length > 0
            ? raw.images
            : [raw.image || "https://via.placeholder.com/400x300?text=No+Image"];
        return { id: doc.id, ...raw, images };
      });

      // Filter
      const filtered = debouncedSearch
        ? data.filter(
            (l) =>
              l.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
              l.location?.toLowerCase().includes(debouncedSearch.toLowerCase())
          )
        : data;

      setListings(filtered);
      setLoading(false);
    });

    return () => unsub();
  }, [debouncedSearch]);

  // 💳 Booking
  const handleBook = async (listing: any) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(listing.price) || 500,
          listingId: listing.id,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to create order");

      openRazorpayCheckout({
        amount: Number(listing.price),
        orderId: data.id,
        name: listing.name,
        email: user.email,
        phone: user.phoneNumber || "9999999999",
        onSuccess: () => alert("✅ Payment Successful"),
        onFailure: () => alert("❌ Payment Failed"),
      });
    } catch (err) {
      console.error("Booking error:", err);
    }
  };

  if (loading) return <p className="p-6 text-gray-500">Loading featured listings...</p>;

  return (
    <>
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={() => setShowLogin(false)}
        bookingCallback={() => {}}
      />

      <section className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-800">🌟 Featured Listings</h2>
          <input
            type="text"
            placeholder="Search featured stays..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-600 w-full sm:w-64"
          />
        </div>

        {listings.length === 0 ? (
          <p className="text-gray-600">No featured listings found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} onBook={handleBook} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/* -----------------------------------------------
   🖼️ ListingCard Component (with scrolling images)
----------------------------------------------- */
function ListingCard({ listing, onBook }: any) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);

  // 🔁 Auto-scroll carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % listing.images.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [listing.images]);

  return (
    <div className="border rounded-xl shadow-md hover:shadow-lg bg-white overflow-hidden transition">
      {/* 🖼️ Carousel */}
      <div className="relative w-full h-48">
        <Image
          src={listing.images[current]}
          alt={listing.name}
          fill
          className="object-cover transition-all duration-700"
        />
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
          {listing.images.map((_: string, i: number) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full ${
                i === current ? "bg-yellow-500" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>

      {/* 📋 Info */}
      <div className="p-4 space-y-1">
        <h3 className="text-lg font-semibold text-gray-800">{listing.name}</h3>
        <p className="text-gray-600 text-sm">{listing.location}</p>
        <p className="text-sm text-gray-500 capitalize">{listing.category}</p>

        <div className="flex justify-between items-center mt-3">
          <span className="text-blue-600 font-bold">₹{listing.price}</span>
          <span className="text-yellow-600 text-sm">⭐ {listing.rating || 4.2}</span>
        </div>

        {/* 🎯 Buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            onClick={() => router.push(`/listing/${listing.id}`)}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800"
          >
            Visit
          </Button>
          <Button
            onClick={() => onBook(listing)}
            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            Book Now
          </Button>
        </div>
      </div>
    </div>
  );
}
