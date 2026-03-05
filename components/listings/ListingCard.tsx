"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/firebase";
import { openRazorpayCheckout } from "@/lib/payments-razorpay";

export interface Listing {
  id: string;
  name: string;
  category?: string;
  location: string;
  price: number | string;
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
  const [user, setUser] = useState<any>(undefined);

  /* Auth status */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u || null);
    });

    return () => unsub();
  }, []);

  /* Safe price */
  const price = Number(listing.price) || 0;

  /* Safe images */
  const images =
    listing.images && listing.images.length > 0
      ? listing.images
      : ["https://via.placeholder.com/400x300?text=No+Image"];

  /* Auto slider */
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [images.length]);

  /* Visit page */
  const handleVisit = () => {
    router.push(`/listing/${listing.id}`);
  };

  /* Booking */
  const handleBookNow = async () => {
    if (user === undefined) return;

    if (!user) {
      router.push(`/login?redirect=/listing/${listing.id}`);
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          listingId: listing.id,
          amount: price,
          userId: user.uid,
        }),
      });

      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      openRazorpayCheckout({
        amount: data.amount,
        orderId: data.id,
        name: listing.name,

        email: user.email || "guest@bharatcomfort.com",
        phone: user.phoneNumber || "",

        onSuccess: (res) => {
          alert(`✅ Payment successful: ${res.razorpay_payment_id}`);
        },

        onFailure: () => {
          alert("❌ Payment failed or cancelled");
        },
      });
    } catch (err) {
      console.error("Booking error:", err);
      alert("Booking failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-2xl shadow-md hover:shadow-lg transition bg-white p-4 flex flex-col overflow-hidden">

      {/* Image Carousel */}
      <div className="relative w-full h-56 mb-3 overflow-hidden rounded-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImage}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            <Image
              src={images[currentImage]}
              alt={listing.name}
              fill
              sizes="(max-width:768px)100vw,(max-width:1200px)50vw,33vw"
              className="object-cover rounded-lg"
            />
          </motion.div>
        </AnimatePresence>

        {/* Indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentImage(i)}
                className={`w-2 h-2 rounded-full transition ${
                  currentImage === i ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Details */}
      <div onClick={handleVisit} className="cursor-pointer flex-grow">
        <h2 className="text-lg font-semibold text-gray-800 hover:text-blue-700 truncate">
          {listing.name}
        </h2>

        <p className="text-gray-600 text-sm truncate">
          {listing.location}
        </p>

        {listing.category && (
          <p className="text-gray-500 text-sm capitalize">
            {listing.category}
          </p>
        )}

        <div className="flex justify-between items-center mt-3">
          <p className="font-bold text-blue-600">
            ₹{price.toLocaleString()}
          </p>

          {listing.rating && (
            <p className="text-yellow-600 text-sm">
              ⭐ {listing.rating}
            </p>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleVisit}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium"
        >
          Visit
        </button>

        <button
          onClick={handleBookNow}
          disabled={loading || user === undefined}
          className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-lg font-medium disabled:opacity-60"
        >
          {loading ? "Processing..." : "Book Now"}
        </button>
      </div>
    </div>
  );
}
