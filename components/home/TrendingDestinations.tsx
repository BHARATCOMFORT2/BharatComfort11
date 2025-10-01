"use client";

export default function TrendingDestinations() {
  const destinations = [
    { name: "Kerala Backwaters", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" },
    { name: "Taj Mahal", image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80" },
    { name: "Leh-Ladakh", image: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=800&q=80" },
  ];

  return (
    <section className="py-16 bg-gradient-to-b from-[#0a0f29] to-blue-950">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-yellow-400 mb-10 text-center">
          Trending Destinations
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {destinations.map((d) => (
            <div
              key={d.name}
              className="rounded-2xl overflow-hidden shadow-lg hover:scale-105 transition"
            >
              <img
                src={d.image}
                alt={d.name}
                className="w-full h-56 object-cover"
              />
              <div className="p-4 bg-blue-900/80">
                <h3 className="text-lg font-semibold text-white">{d.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
