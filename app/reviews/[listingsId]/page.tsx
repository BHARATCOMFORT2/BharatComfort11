"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";

interface Review {
  id: string;
  listingId: string;
  userName: string;
  rating: number;
  comment: string;
  reply?: string;
  createdAt: any;
}

export default function ListingReviewsPage({
  params,
}: {
  params: { listingId: string };
}) {
  const { listingId } = params;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const q = query(
          collection(db, "reviews"),
          where("listingId", "==", listingId),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);

        const data: Review[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Review),
        }));
        setReviews(data);
      } catch (err) {
        console.error("Error fetching reviews:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [listingId]);

  if (loading) return <p className="text-center py-12">Loading reviews...</p>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">
        Reviews for Listing <span className="text-blue-600">#{listingId}</span>
      </h1>

      {reviews.length === 0 ? (
        <p className="text-center text-gray-600">No reviews yet for this listing.</p>
      ) : (
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
              <p className="text-xs text-gray-500 mb-3">
                {review.createdAt?.toDate
                  ? review.createdAt.toDate().toLocaleDateString()
                  : "-"}
              </p>

              {/* Show Partner Reply */}
              {review.reply && (
                <div className="bg-gray-50 border-l-4 border-blue-500 p-3 rounded">
                  <p className="text-sm">
                    <strong className="text-blue-600">Partner Reply:</strong>{" "}
                    {review.reply}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
