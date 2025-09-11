"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

interface Review {
  id: string;
  listingId: string;
  userName: string;
  rating: number;
  comment: string;
  reply?: string;
  createdAt: any;
}

export default function PartnerReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [replying, setReplying] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    const fetchPartnerReviews = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push("/auth/login");
        return;
      }

      try {
        // Step 1: Get listings owned by this partner
        const listingsSnap = await getDocs(
          query(collection(db, "listings"), where("partnerId", "==", user.uid))
        );
        const listingIds = listingsSnap.docs.map((doc) => doc.id);

        if (listingIds.length === 0) {
          setReviews([]);
          return;
        }

        // Step 2: Fetch reviews for those listings
        const reviewsSnap = await getDocs(
          query(
            collection(db, "reviews"),
            where("listingId", "in", listingIds),
            orderBy("createdAt", "desc")
          )
        );

        const data: Review[] = reviewsSnap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Review),
        }));

        setReviews(data);
      } catch (err) {
        console.error("Error fetching partner reviews:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPartnerReviews();
  }, [router]);

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return;

    try {
      const reviewRef = doc(db, "reviews", reviewId);
      await updateDoc(reviewRef, {
        reply: replyText,
      });

      // Update local state
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, reply: replyText } : r
        )
      );

      setReplying(null);
      setReplyText("");
    } catch (err) {
      console.error("Error saving reply:", err);
    }
  };

  if (loading) return <p className="text-center py-12">Loading your reviews...</p>;

  if (reviews.length === 0) {
    return (
      <p className="text-center py-12">
        No reviews found for your listings yet.
      </p>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Reviews on Your Listings</h1>

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
              Listing: {review.listingId} •{" "}
              {review.createdAt?.toDate
                ? review.createdAt.toDate().toLocaleDateString()
                : "-"}
            </p>

            {/* Existing Reply */}
            {review.reply && (
              <div className="bg-gray-50 border-l-4 border-blue-500 p-3 mb-3 rounded">
                <p className="text-sm">
                  <strong>Your Reply:</strong> {review.reply}
                </p>
              </div>
            )}

            {/* Reply Form */}
            {replying === review.id ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 border rounded px-3 py-2 text-sm"
                  placeholder="Write your reply..."
                />
                <button
                  onClick={() => handleReply(review.id)}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setReplying(null);
                    setReplyText("");
                  }}
                  className="bg-gray-300 px-4 py-2 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              !review.reply && (
                <button
                  onClick={() => setReplying(review.id)}
                  className="text-blue-600 text-sm"
                >
                  Reply
                </button>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
