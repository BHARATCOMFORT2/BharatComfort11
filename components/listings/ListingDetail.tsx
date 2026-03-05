"use client";

import Image from "next/image";
import { Button } from "@/components/ui/Button";

type ListingDetailProps = {
  id?: string;
  title: string;
  image?: string;
  location: string;
  description: string;
  price?: number | string;
  rating?: number;
  lat?: number;
  lng?: number;
};

export default function ListingDetail({
  id,
  title,
  image,
  location,
  description,
  price,
  rating,
  lat,
  lng,
}: ListingDetailProps) {

  const safeImage =
    image || "https://via.placeholder.com/1200x800?text=No+Image";

  const formattedPrice =
    typeof price === "number"
      ? `₹${price.toLocaleString()}`
      : price;

  const handleDirections = () => {
    if (lat && lng) {
      window.open(
        `https://www.google.com/maps?q=${lat},${lng}`,
        "_blank"
      );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Image */}

      <div className="relative w-full h-[420px] rounded-xl overflow-hidden shadow">
        <Image
          src={safeImage}
          alt={title}
          fill
          sizes="(max-width:768px)100vw,(max-width:1200px)80vw,1000px"
          className="object-cover"
        />
      </div>

      {/* Title */}

      <div className="space-y-2">

        <h1 className="text-3xl font-bold text-gray-800">
          {title}
        </h1>

        <p className="text-gray-500">
          📍 {location}
        </p>

        {rating && (
          <p className="text-yellow-600">
            ⭐ {rating.toFixed(1)}
          </p>
        )}

        {formattedPrice && (
          <p className="text-2xl font-semibold text-blue-600">
            {formattedPrice} / night
          </p>
        )}

      </div>

      {/* Description */}

      <div className="text-gray-700 leading-relaxed">
        {description}
      </div>

      {/* Actions */}

      <div className="flex flex-wrap gap-4 pt-4">

        <Button
          onClick={() => {
            if (id) window.location.href = `/listing/${id}/booking`;
          }}
        >
          Book Now
        </Button>

        {lat && lng && (
          <Button
            variant="secondary"
            onClick={handleDirections}
          >
            Get Directions
          </Button>
        )}

      </div>

    </div>
  );
}
