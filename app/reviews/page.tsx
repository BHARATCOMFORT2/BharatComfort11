"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

interface Review {
  id: string;
  listingId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

       const data: Review[] = snapshot.docs.map((doc) => ({
  ...(doc.data() as Review),
  id: doc.id, // now this overwrites any id inside doc.data()
}));
        setReviews(data);
      } catch (err) {
        console.error("Error fetching reviews:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  if (loading) return <p className="text-center py-12">Loading reviews...</p>;

  if (reviews.length === 0) {
    return <p className="text-center py-12">No reviews yet.</p>;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">All Reviews</h1>

      <div className="grid gap-6">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-white shadow rounded-lg p-6 border border-gray-200"
          >
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold">{review.userName}</h2>
              <span className="text-yellow-500">
                {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
              </span>
            </div>
            <p className="text-gray-700 mb-2">{review.comment}</p>
            <p className="text-xs text-gray-500">
              Listing: {review.listingId} •{" "}
              {review.createdAt?.toDate
                ? review.createdAt.toDate().toLocaleDateString()
                : "-"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
