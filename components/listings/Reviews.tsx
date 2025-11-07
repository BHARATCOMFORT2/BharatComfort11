// components/listings/Reviews.tsx
"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";

export default function Reviews({ listingId }: { listingId: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [user, setUser] = useState<any>(null);

  // Auth
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsub();
  }, []);

  // Fetch reviews
  useEffect(() => {
    const q = query(
      collection(db, "reviews"),
      where("listingId", "==", listingId),
      where("status", "==", "approved")
    );
    const unsub = onSnapshot(q, (snap) =>
      setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [listingId]);

  const submitReview = async () => {
    if (!user) return alert("Please login first");
    const token = await user.getIdToken();
    const res = await fetch("/api/reviews/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ listingId, rating, comment }),
    });
    const data = await res.json();
    alert(data.success ? "✅ Review submitted for approval" : "❌ " + data.error);
    setRating(5);
    setComment("");
  };

  return (
    <div className="mt-8 bg-white rounded-2xl p-6 shadow">
      <h3 className="text-lg font-semibold mb-3">Reviews</h3>

      {reviews.length > 0 ? (
        <ul className="space-y-3 mb-4">
          {reviews.map((r) => (
            <li key={r.id} className="border-b pb-2">
              <div className="flex justify-between">
                <p className="font-medium">{r.userName}</p>
                <p className="text-yellow-500">{"★".repeat(r.rating)}</p>
              </div>
              <p className="text-gray-600 text-sm">{r.comment}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 mb-4">No reviews yet.</p>
      )}

      <div className="border-t pt-3">
        <h4 className="font-medium mb-2">Add Your Review</h4>
        <select
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="border rounded p-2 mr-2"
        >
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>{`${r} ★`}</option>
          ))}
        </select>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="border rounded w-full p-2 mb-2 mt-2"
          rows={3}
          placeholder="Write your feedback..."
        />
        <button
          onClick={submitReview}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Submit Review
        </button>
      </div>
    </div>
  );
}
