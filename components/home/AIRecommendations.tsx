"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import Image from "next/image";

export default function AIRecommendations() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const res = await fetch("/api/ai/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.uid }),
        });
        const data = await res.json();
        if (data.success) setRecommendations(data.data);
      } catch (e) {
        console.error("AI fetch failed:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading)
    return (
      <div className="text-center text-gray-500 py-10">
        ✨ Fetching personalized travel ideas for you...
      </div>
    );

  return (
    <div className="bg-[#fff9f2] py-10 px-6 rounded-2xl shadow-sm">
      <h2 className="text-2xl font-semibold mb-6 text-center text-yellow-900">
        🌍 AI Travel Recommendations for You
      </h2>
      <div className="grid md:grid-cols-3 gap-6">
        {recommendations.map((rec, i) => (
          <div key={i} className="bg-white rounded-2xl shadow p-4 hover:shadow-md transition">
            {rec.image && (
              <Image
                src={rec.image}
                alt={rec.title}
                width={400}
                height={250}
                className="rounded-xl mb-3 object-cover"
              />
            )}
            <h3 className="text-lg font-semibold text-yellow-800">{rec.title}</h3>
            <p className="text-gray-600 text-sm mt-2">{rec.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
