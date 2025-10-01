"use client";

export default function FeaturedListings() {
  const listings = [
    {
      title: "Luxury Palace Stay",
      image:
        "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80",
      location: "Jaipur, Rajasthan",
    },
    {
      title: "Beachside Resort",
      image:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
      location: "Goa",
    },
    {
      title: "Mountain Retreat",
      image:
        "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
      location: "Manali, Himachal Pradesh",
    },
  ];

  return (
    <section className="py-16 bg-[#0a0f29]">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-yellow-400 mb-10 text-center">
          Featured Listings
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {listings.map((listing) => (
            <div
              key={listing.title}
              className="rounded-2xl overflow-hidden shadow-lg bg-white/5 border border-white/10 hover:scale-105 transition"
            >
              <img
                src={listing.image}
                alt={listing.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white">
                  {listing.title}
                </h3>
                <p className="text-gray-400">{listing.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
