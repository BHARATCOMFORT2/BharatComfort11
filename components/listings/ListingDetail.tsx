"use client";

import { Button } from "@/components/ui/Button";

type ListingDetailProps = {
  title: string;
  image: string;
  location: string;
  description: string;
  price?: string;
};

export default function ListingDetail({
  title,
  image,
  location,
  description,
  price,
}: ListingDetailProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <img src={image} alt={title} className="w-full h-96 object-cover rounded-lg shadow" />
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-gray-500">{location}</p>
      {price && <p className="text-xl font-semibold">{price}</p>}
      <p className="text-gray-700">{description}</p>
      <div className="flex gap-4 mt-6">
        <Button variant="default">Book Now</Button>
        <Button variant="secondary">Get Directions</Button>
      </div>
    </div>
  );
}
