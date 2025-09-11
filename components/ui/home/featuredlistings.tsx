"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Link from "next/link";

const demoListings = [
  { id: "1", title: "Luxury Hotel Mumbai", location: "Mumbai, India", price: "₹5000/night" },
  { id: "2", title: "Beach Resort Goa", location: "Goa, India", price: "₹7000/night" },
  { id: "3", title: "Heritage Stay Jaipur", location: "Jaipur, India", price: "₹3000/night" },
];

export default function FeaturedListings() {
  return (
    <section className="py-16 px-6 max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">🌟 Featured Listings</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {demoListings.map((listing) => (
          <Card key={listing.id}>
            <CardHeader>{listing.title}</CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{listing.location}</p>
              <p className="font-semibold">{listing.price}</p>
              <div className="mt-3 flex gap-3">
                <Link
                  href={`/listings/${listing.id}`}
                  className="text-blue-600 hover:underline"
                >
                  View
                </Link>
                <button className="text-green-600 hover:underline">
                  Book Now
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
