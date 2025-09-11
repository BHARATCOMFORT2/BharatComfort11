"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";

interface Review {
  id: string;
  listingId: string;
  userName: string;
  rating: number;
  comment: string;
  reply?: string;
  createdAt: any;
  upvotes?: string[];
  downvotes?: string[];
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

  const handleVote = async (reviewId: string, type: "up" | "down") => {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to vote on reviews.");
      return;
    }

    try {
      const reviewRef = doc(db, "reviews", reviewId);
      const review = reviews.find((r) => r.id === reviewId);
      if (!review) return;

      const upvotes = review.upvotes || [];
      const downvotes = review.downvotes || [];

      let newUpvotes = [...upvotes];
      let newDownvotes = [...downvotes];

      if (type === "up") {
        if (upvotes.includes(user.uid)) {
          newUpvotes = upvotes.filter((id) => id !== user.uid);
        } else {
          newUpvotes = [...upvotes, user.uid];
          newDownvotes = downvotes.filter((id) => id !== user.uid);
        }
      } else {
        if (downvotes.includes(user.uid)) {
          newDownvotes = downvotes.filter((id) => id !== user.uid);
        } else {
          newDownvotes = [...downvotes, user.uid];
          newUpvotes = upvotes.filter((id) => id !== user.uid);
        }
      }

      await updateDoc(reviewRef, {
        upvotes: newUpvotes,
        downvotes: newDownvotes,
      });

      // Update state
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, upvotes: newUpvotes, downvotes: newDownvotes }
            : r
        )
      );
    } catch (err) {
      console.error("Error voting on review:", err);
    }
  };

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

              {/* Partner Reply */}
              {review.reply && (
                <div className="bg-gray-50 border-l-4 border-blue-500 p-3 rounded mb-3">
                  <p className="text-sm">
                    <strong className="text-blue-600">Partner Reply:</strong>{" "}
                    {review.reply}
                  </p>
                </div>
              )}

              {/* Voting buttons */}
              <div className="flex items-center gap-4 text-sm">
                <button
                  onClick={() => handleVote(review.id, "up")}
                  className="flex items-center gap-1 text-green-600"
                >
                  👍 {review.upvotes?.length || 0}
                </button>
                <button
                  onClick={() => handleVote(review.id, "down")}
                  className="flex items-center gap-1 text-red-600"
                >
                  👎 {review.downvotes?.length || 0}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
