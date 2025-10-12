// components/home/AIRecommendations.tsx
"use client";

import { useEffect, useState } from "react";

interface AIRecommendationsProps {
  user?: {
    name?: string;
    email?: string;
    role?: string;
    profilePic?: string;
  };
}

export default function AIRecommendations({ user }: AIRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const res = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: `Suggest trips for user ${user?.name || "Guest"}` }),
        });
        const data = await res.json();
        setRecommendations(data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [user]);

  if (loading) return <p className="text-center py-6">Loading AI recommendations...</p>;

  return (
    <div className="py-12 container mx-auto">
      <h2 className="text-2xl font-bold mb-4">Recommended for you</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.map((rec, idx) => (
          <div key={idx} className="p-4 bg-white rounded-2xl shadow">
            <h3 className="font-semibold">{rec.title}</h3>
            <p className="text-gray-500">{rec.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
