"use client";

import RatingStars from "./RatingStars";

type ReviewSummaryProps = {
  average: number;
  total: number;
  distribution: { [stars: number]: number }; // e.g., {5: 20, 4: 10, 3: 5, 2: 2, 1: 1}
};

export default function ReviewSummary({
  average,
  total,
  distribution,
}: ReviewSummaryProps) {
  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm max-w-md">
      <h3 className="text-lg font-semibold mb-2">Ratings & Reviews</h3>

      <div className="flex items-center mb-4">
        <span className="text-3xl font-bold mr-2">{average.toFixed(1)}</span>
        <RatingStars rating={Math.round(average)} />
        <span className="ml-2 text-gray-500 text-sm">({total} reviews)</span>
      </div>

      <div className="space-y-1">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={star} className="flex items-center text-sm">
              <span className="w-10">{star}★</span>
              <div className="flex-1 bg-gray-200 h-3 rounded mx-2">
                <div
                  className="bg-yellow-400 h-3 rounded"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-gray-600">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
