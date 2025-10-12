// app/components/home/AIRecommendations.tsx
"use client";

import { useEffect, useState } from "react";
import { openRazorpayCheckout } from "@/lib/payments-razorpay";

export interface AIRecommendationsProps {
  profile: { name?: string; email?: string; role?: string };
}

interface Recommendation {
  title: string;
  description: string;
  price?: number;
  id?: string;
}

export default function AIRecommendations({ profile }: AIRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    async function fetchRecommendations() {
      setLoading(true);
      try {
        const res = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `Give 5 travel recommendations for a user named ${profile.name}. Return JSON array with title, description, and price.`,
          }),
        });
        const data = await res.json();
        setRecommendations(data.data || []);
      } catch (err) {
        console.error(err);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [profile]);

  const handleBooking = async (rec: Recommendation) => {
    if (!rec.price) return alert("Price missing for this recommendation");

    try {
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: rec.price, listingId: rec.id || "ai-rec" }),
      });

      const data = await res.json();
      if (!data.id) return alert("Failed to create order");

      openRazorpayCheckout({
        amount: rec.price,
        orderId: data.id,
        name: profile.name || "Booking",
        email: profile.email || "",
        onSuccess: () => alert(`Payment successful for ${rec.title}`),
        onFailure: () => alert("Payment failed"),
      });
    } catch (err) {
      console.error(err);
      alert("Error creating order");
    }
  };

  if (loading) return <p>Loading AI recommendations...</p>;
  if (!recommendations.length) return <p>No AI recommendations available</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {recommendations.map((rec, idx) => (
        <div key={idx} className="p-4 bg-white rounded-2xl shadow flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold">{rec.title}</h3>
            <p className="text-gray-500 mt-1">{rec.description}</p>
            {rec.price && <p className="text-indigo-600 font-bold mt-2">₹{rec.price}</p>}
          </div>
          {rec.price && (
            <button
              className="mt-4 bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700"
              onClick={() => handleBooking(rec)}
            >
              Book Now
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
