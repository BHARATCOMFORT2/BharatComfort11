// components/home/TrendingDestinations.tsx

"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/Card";
import { motion } from "framer-motion";

interface Destination {
  id: number;
  name: string;
  country: string;
  image: string;
}

const destinations: Destination[] = [
  {
    id: 1,
    name: "Bali",
    country: "Indonesia",
    image: "/images/destinations/bali.jpg",
  },
  {
    id: 2,
    name: "Paris",
    country: "France",
    image: "/images/destinations/paris.jpg",
  },
  {
    id: 3,
    name: "Tokyo",
    country: "Japan",
    image: "/images/destinations/tokyo.jpg",
  },
  {
    id: 4,
    name: "New York",
    country: "USA",
    image: "/images/destinations/newyork.jpg",
  },
];

export default function TrendingDestinations() {
  return (
    <section className="py-12 px-4 md:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <h2 className="text-3xl font-bold mb-6 text-gray-900">
          Trending Destinations
        </h2>
        <p className="text-gray-600 mb-10">
          Explore the most popular destinations loved by travelers around the
          world.
        </p>

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {destinations.map((dest) => (
            <motion.div
              key={dest.id}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="overflow-hidden rounded-2xl shadow hover:shadow-lg transition">
                <div className="relative h-48 w-full">
                  <Image
                    src={dest.image}
                    alt={dest.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold">{dest.name}</h3>
                  <p className="text-sm text-gray-500">{dest.country}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
