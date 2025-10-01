"use client";

export default function Testimonials() {
  const testimonials = [
    {
      name: "Aarav Sharma",
      role: "Business Traveler",
      feedback:
        "BharatComfort made my trip seamless. The luxury feel and smooth booking experience were unmatched!",
      image:
        "https://randomuser.me/api/portraits/men/32.jpg",
    },
    {
      name: "Priya Nair",
      role: "Travel Enthusiast",
      feedback:
        "Absolutely loved the curated destinations. The service felt premium and trustworthy!",
      image:
        "https://randomuser.me/api/portraits/women/44.jpg",
    },
    {
      name: "Rohan Verma",
      role: "Adventure Seeker",
      feedback:
        "From mountains to beaches, I found everything here. The deals are fantastic too!",
      image:
        "https://randomuser.me/api/portraits/men/56.jpg",
    },
  ];

  return (
    <section className="py-16 bg-[#0a0f29]">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-yellow-400 mb-12 text-center">
          What Our Travelers Say
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-white/5 border border-white/10 rounded-2xl shadow-lg p-6 text-center hover:scale-105 transition"
            >
              <img
                src={t.image}
                alt={t.name}
                className="w-20 h-20 rounded-full mx-auto border-4 border-yellow-400 mb-4"
              />
              <p className="text-gray-300 italic mb-4">"{t.feedback}"</p>
              <h3 className="font-semibold text-white">{t.name}</h3>
              <span className="text-yellow-400 text-sm">{t.role}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
