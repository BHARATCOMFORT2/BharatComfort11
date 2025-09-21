"use client";

interface RatingStarsProps {
  rating: number; // 0–5
}

export default function RatingStars({ rating }: RatingStarsProps) {
  const stars = Array.from({ length: 5 }, (_, i) => i < rating);

  return (
    <div className="flex">
      {stars.map((filled, i) => (
        <span key={i} className={filled ? "text-yellow-500" : "text-gray-300"}>
          ★
        </span>
      ))}
    </div>
  );
}
