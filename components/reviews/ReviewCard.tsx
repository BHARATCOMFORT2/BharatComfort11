"use client";

export default function ReviewCard({ review }: { review: { user: string; rating: number; comment: string } }) {
  return (
    <div className="border p-4 rounded shadow-sm">
      <h4 className="font-bold">{review.user}</h4>
      <p>⭐ {review.rating}/5</p>
      <p className="text-gray-600">{review.comment}</p>
    </div>
  );
}
