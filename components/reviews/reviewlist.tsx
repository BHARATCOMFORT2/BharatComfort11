"use client";

type Review = {
  id: string;
  user: string;
  rating: number;
  comment: string;
  date: string;
};

type ReviewListProps = {
  reviews: Review[];
};

export default function ReviewList({ reviews }: ReviewListProps) {
  if (reviews.length === 0) {
    return <p className="text-gray-600">No reviews yet. Be the first!</p>;
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div
          key={review.id}
          className="p-4 border rounded-lg bg-white shadow-sm"
        >
          <div className="flex justify-between items-center mb-2">
            <p className="font-medium">{review.user}</p>
            <span className="text-sm text-gray-500">{review.date}</span>
          </div>

          <div className="flex items-center mb-2">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className={`text-lg ${
                  i < review.rating ? "text-yellow-400" : "text-gray-300"
                }`}
              >
                ★
              </span>
            ))}
          </div>

          <p className="text-gray-700">{review.comment}</p>
        </div>
      ))}
    </div>
  );
}
