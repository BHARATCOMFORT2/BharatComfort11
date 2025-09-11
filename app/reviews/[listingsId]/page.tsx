"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

interface Review {
  id: string;
  listingId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export default function ListingReviewsPage({
  params,
}: {
  params: { listingId: string };
}) {
  const { listingId } = params;
  const router = useRouter();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // New review form state
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;

    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (!comment.trim()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, "reviews"), {
        listingId,
        userId: user.uid,
        userName: user.displayName || "Anonymous",
        rating,
        comment,
        createdAt: serverTimestamp(),
      });

      // Refresh page data
      setComment("");
      setRating(5);
      router.refresh();
    } catch (err) {
      console.error("Error submitting review:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-center py-12">Loading reviews...</p>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">
        Reviews for Listing <span className="text-blue-600">#{listingId}</span>
      </h1>

      {reviews.length === 0 ? (
        <p className="text-center text-gray-600 mb-8">
          No reviews yet for this listing.
        </p>
      ) : (
        <div className="grid gap-6 mb-12">
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
                {review.createdAt?.toDate
                  ? review.createdAt.toDate().toLocaleDateString()
                  : "-"}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Review Submission Form */}
      <div className="bg-gray-50 p-6 rounded-lg shadow border">
        <h2 className="text-xl font-semibold mb-4">Leave a Review</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 font-medium">Rating</label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="border rounded p-2 w-full"
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r} Star{r > 1 && "s"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 font-medium">Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="border rounded p-2 w-full"
              rows={4}
              placeholder="Write your experience..."
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      </div>
    </div>
  );
}
