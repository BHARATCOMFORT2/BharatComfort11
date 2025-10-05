"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function TrendingDestinations() {
  const destinations = [
    {
      id: "1",
      name: "Kerala Backwaters",
      image:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
      description: "Cruise through serene backwaters and experience Kerala's lush landscapes.",
    },
    {
      id: "2",
      name: "Taj Mahal",
      image:
        "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
      description: "Witness the grandeur of this iconic monument and the stories it holds.",
    },
    {
      id: "3",
      name: "Leh-Ladakh",
      image:
        "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=800&q=80",
      description: "Adventure amidst the Himalayas with breathtaking mountain views.",
    },
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-[#fff8f0] via-[#fff5e8] to-[#fff1dd]">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-serif font-bold text-yellow-800 mb-12 text-center">
          Trending Destinations
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 justify-items-center">
          {destinations.map((d, index) => (
            <motion.div
              key={d.id}
              className="w-full sm:w-64 md:w-72 relative rounded-2xl overflow-hidden shadow-xl border border-yellow-200/20 bg-white/40 backdrop-blur-lg"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              whileHover={{ scale: 1.05 }}
            >
              <img
                src={d.image}
                alt={d.name}
                className="w-full h-40 object-cover rounded-t-2xl"
              />
              <div className="p-6">
                <h3 className="text-xl font-semibold text-yellow-900 mb-2">
                  {d.name}
                </h3>
                <p className="text-gray-700 text-sm line-clamp-2 mb-3">
                  {d.description}
                </p>
                <Link
                  href={`/destinations/${d.id}`}
                  className="text-yellow-700 font-semibold hover:underline text-sm"
                >
                  Read More →
                </Link>
              </div>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-yellow-100/20 via-yellow-200/10 to-transparent opacity-0 hover:opacity-40 transition-opacity duration-500 pointer-events-none"></div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
