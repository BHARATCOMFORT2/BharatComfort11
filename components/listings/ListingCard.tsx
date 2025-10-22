"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/firebase"; // ✅ Firebase Auth
import { openRazorpayCheckout } from "@/lib/payments-razorpay";

export interface Listing {
  id: string;
  name: string;
  category?: string;
  location: string;
  price: string | number;
  rating?: number;
  images?: string[];
  lat?: number;
  lng?: number;
  partnerId?: string;
  ownerId?: string;
}

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [user, setUser] = useState<any>(undefined); // null = not logged in, undefined = checking

  // ✅ Check Auth Status
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u || null));
    return () => unsub();
  }, []);

  /** ✅ Safe fallback if no images */
  const images =
    listing.images && listing.images.length > 0
      ? listing.images
      : ["https://via.placeholder.com/400x300?text=No+Image+Available"];

  /** 🔁 Auto-slide images */
  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images.length]);

  /** 🔗 Navigate to full details page */
  const handleVisit = () => {
    router.push(`/listing/${listing.id}`);
  };

  /** 💳 Secure Booking — only logged-in users */
  const handleBookNow = async () => {
    if (user === undefined) {
      alert("Checking your login status...");
      return;
    }

    if (!user) {
      alert("Please log in to continue booking.");
      router.push(`/login?redirect=/listing/${listing.id}`);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(listing.price) || 500,
          listingId: listing.id,
          userId: user.uid,
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Failed to create order");

      // ✅ Open Razorpay checkout
      openRazorpayCheckout({
        amount: Number(listing.price) || 500,
        orderId: data.id,
        name: listing.name,
        email: user.email || "guest@bharatcomfort.com",
        phone: user.phoneNumber || "9999999999",
        onSuccess: (res) => {
          alert(`✅ Payment successful: ${res.razorpay_payment_id}`);
        },
        onFailure: (err) => {
          console.error("❌ Payment failed:", err);
          alert("Payment failed or cancelled");
        },
      });
    } catch (err) {
      console.error("❌ Booking failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 bg-white p-4 flex flex-col justify-between overflow-hidden">
      {/* 🖼️ Image Carousel */}
      <div className="relative w-full h-56 mb-3 overflow-hidden rounded-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImage}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0"
          >
            <Image
              src={images[currentImage]}
              alt={`${listing.name} image ${currentImage + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover rounded-lg"
            />
          </motion.div>
        </AnimatePresence>

        {/* Carousel Indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentImage(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  currentImage === i ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* 🏕️ Details */}
      <div onClick={handleVisit} className="cursor-pointer flex-grow">
        <h2 className="text-lg font-semibold text-gray-800 hover:text-blue-700 truncate">
          {listing.name}
        </h2>
        <p className="text-gray-600 text-sm truncate">{listing.location}</p>
        {listing.category && (
          <p className="text-gray-500 text-sm capitalize">
            {listing.category}
          </p>
        )}

        <div className="flex justify-between items-center mt-3">
          <p className="font-bold text-blue-600">₹{listing.price}</p>
          {listing.rating && (
            <p className="text-yellow-600 text-sm">⭐ {listing.rating}</p>
          )}
        </div>

        {(listing.partnerId || listing.ownerId) && (
          <p className="mt-2 text-xs text-gray-400">
            Owner: {listing.partnerId || listing.ownerId}
          </p>
        )}
      </div>

      {/* 💳 Buttons */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleVisit}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition"
        >
          Visit
        </button>

        <button
          onClick={handleBookNow}
          disabled={loading || user === undefined}
          className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-lg font-medium transition disabled:opacity-60"
        >
          {loading ? "Processing..." : "Book Now"}
        </button>
      </div>
    </div>
  );
}
