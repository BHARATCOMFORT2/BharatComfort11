"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

type ListingCardProps = {
  id: string;
  title: string;
  image: string;
  location: string;
  price?: string;
};

export default function ListingCard({ id, title, image, location, price }: ListingCardProps) {
  return (
    <div className="border rounded-lg shadow-sm overflow-hidden hover:shadow-md transition">
      <img src={image} alt={title} className="w-full h-48 object-cover" />
      <div className="p-4 space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-gray-500">{location}</p>
        {price && <p className="font-bold">{price}</p>}
        <div className="flex gap-2 mt-3">
          <Button variant="primary" asChild>
            <Link href={`/listings/${id}`}>View</Link>
          </Button>
          <Button variant="secondary">Book Now</Button>
        </div>
      </div>
    </div>
  );
}
