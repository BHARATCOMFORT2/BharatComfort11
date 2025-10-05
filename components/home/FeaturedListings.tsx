"use client";

import Link from "next/link";

const listings = [
  {
    id: "1",
    title: "Luxury Palace Stay",
    image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80",
    location: "Jaipur, Rajasthan",
    description: "Experience royal luxury in the heart of Jaipur with stunning palaces and modern amenities.",
  },
  {
    id: "2",
    title: "Beachside Resort",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    location: "Goa",
    description: "Relax at this serene beachside resort with beautiful ocean views and excellent service.",
  },
  {
    id: "3",
    title: "Mountain Retreat",
    image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
    location: "Manali, Himachal Pradesh",
    description: "Enjoy nature and tranquility at this cozy mountain retreat surrounded by peaks.",
  },
];

export default function FeaturedListings() {
  return (
    <section className="py-16 bg-[#fff8f0]">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-yellow-800 mb-10 text-center">
          Featured Listings
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 justify-items-center">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="w-full sm:w-64 md:w-72 rounded-2xl overflow-hidden shadow-lg bg-white/40 backdrop-blur-lg border border-white/10 hover:scale-105 transition"
            >
              <img
                src={listing.image}
                alt={listing.title}
                className="w-full h-32 object-cover"
              />
              <div className="p-6">
                <h3 className="text-lg font-semibold text-yellow-900 mb-1">
                  {listing.title}
                </h3>
                <p className="text-gray-700 text-sm mb-2">{listing.location}</p>
                <p className="text-gray-600 text-sm line-clamp-2 mb-3">{listing.description}</p>
                <Link
                  href={`/listings/${listing.id}`}
                  className="text-yellow-700 font-semibold hover:underline text-sm"
                >
                  Read More →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
