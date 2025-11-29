const cities = ["Delhi", "Mumbai", "Goa", "Manali", "Jaipur", "Udaipur", "Shimla"];
const types = [
  { type: "Hotel", category: "hotel" },
  { type: "Resort", category: "resort" },
  { type: "Cafe", category: "cafe" },
  { type: "Restaurant", category: "restaurant" },
  { type: "Guest House", category: "guest_house" },
];

const images = {
  hotel: "https://images.unsplash.com/photo-1566073771259-6a8506099945",
  resort: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b",
  cafe: "https://images.unsplash.com/photo-1552566626-52f8b828add9",
  restaurant: "https://images.unsplash.com/photo-1601050690597-df0568f70950",
  guest_house: "https://images.unsplash.com/photo-1505692952047-1a78307da8f2",
};

export const demoListings = Array.from({ length: 120 }).map((_, i) => {
  const city = cities[i % cities.length];
  const t = types[i % types.length];

  return {
    id: `DEMO-${i + 1}`,
    name: `${city} ${t.type} ${i + 1}`,
    type: t.type,
    category: t.category,
    city,
    location: city,
    price: 999 + (i % 10) * 500,
    pricePerNight: 999 + (i % 10) * 500,
    rating: (3 + (i % 3) + Math.random()).toFixed(1),
    images: [images[t.category as keyof typeof images]],
    allowPayAtHotel: false,
    isDemo: true,           // ✅ BOOKING DISABLED FLAG
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  };
});
