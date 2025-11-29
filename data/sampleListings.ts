export const hotels = [
  {
    id: "H001",
    name: "Hotel Royal Palace",
    category: "hotel",          // ✅ frontend filter
    type: "Hotel",
    city: "Delhi",
    location: "Delhi",         // ✅ frontend UI
    price: 2499,               // ✅ frontend filter uses `price`
    pricePerNight: 2499,
    rating: 4.3,
    allowPayAtHotel: true,     // ✅ frontend filter
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b"
    ],
    rooms: [
      { type: "Deluxe", price: 2499, available: 8 },
      { type: "Super Deluxe", price: 3299, available: 5 }
    ],
    amenities: ["Wifi", "AC", "Parking", "Restaurant"],
    status: "ACTIVE"           // ✅ frontend + backend uniform
  },
  {
    id: "H002",
    name: "Green Valley Guest House",
    category: "hotel",
    type: "Guest House",
    city: "Manali",
    location: "Manali",
    price: 1799,
    pricePerNight: 1799,
    rating: 4.5,
    allowPayAtHotel: true,
    images: [
      "https://images.unsplash.com/photo-1505692952047-1a78307da8f2"
    ],
    rooms: [
      { type: "Standard", price: 1799, available: 6 }
    ],
    amenities: ["Mountain View", "Wifi", "Balcony"],
    status: "ACTIVE"
  }
  // ✅ Isi pattern par baaki bhi add kar sakte ho
];

export const restaurants = [
  {
    id: "R001",
    name: "Spice Junction",
    category: "restaurant",    // ✅ frontend filter
    type: "Restaurant",
    city: "Delhi",
    location: "Delhi",
    price: 260,                // ✅ frontend filter
    rating: 4.4,
    veg: true,
    allowPayAtHotel: true,
    images: [
      "https://images.unsplash.com/photo-1552566626-52f8b828add9"
    ],
    menu: [
      { name: "Paneer Butter Masala", price: 260 },
      { name: "Dal Tadka", price: 190 }
    ],
    status: "ACTIVE"
  },
  {
    id: "R002",
    name: "Punjabi Tadka Dhaba",
    category: "restaurant",
    type: "Dhaba",
    city: "Amritsar",
    location: "Amritsar",
    price: 210,
    rating: 4.5,
    veg: true,
    allowPayAtHotel: true,
    images: [
      "https://images.unsplash.com/photo-1601050690597-df0568f70950"
    ],
    menu: [
      { name: "Sarson Da Saag", price: 210 },
      { name: "Makki Roti", price: 60 }
    ],
    status: "ACTIVE"
  }
];
