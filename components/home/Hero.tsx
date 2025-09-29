"use client";

export default function Hero() {
  return (
    <section className="relative h-[90vh] flex items-center justify-center text-center px-6">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80')",
        }}
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-950/90 to-indigo-900/80" />

      {/* Content */}
      <div className="relative z-10 max-w-3xl">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 text-yellow-400 drop-shadow-lg">
          Discover Comfort in Every Journey
        </h1>
        <p className="text-lg md:text-xl text-gray-200 mb-8">
          Your trusted partner for travel, stays, and memorable experiences.
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="/listings"
            className="px-6 py-3 bg-yellow-500 text-blue-950 font-semibold rounded-xl shadow hover:bg-yellow-400 transition"
          >
            Explore Listings
          </a>
          <a
            href="/about"
            className="px-6 py-3 bg-white/10 text-white font-semibold rounded-xl shadow hover:bg-white/20 transition"
          >
            Learn More
          </a>
        </div>
      </div>
    </section>
  );
}
