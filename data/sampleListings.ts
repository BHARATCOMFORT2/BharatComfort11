export const hotels = [
  {
    id: "H001",
    name: "Hotel Royal Palace",
    type: "Hotel",
    city: "Delhi",
    pricePerNight: 2499,
    rating: 4.3,
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b"
    ],
    rooms: [
      { type: "Deluxe", price: 2499, available: 8 },
      { type: "Super Deluxe", price: 3299, available: 5 }
    ],
    amenities: ["Wifi", "AC", "Parking", "Restaurant"],
    status: "active"
  },
  {
    id: "H002",
    name: "Green Valley Guest House",
    type: "Guest House",
    city: "Manali",
    pricePerNight: 1799,
    rating: 4.5,
    images: [
      "https://images.unsplash.com/photo-1505692952047-1a78307da8f2"
    ],
    rooms: [
      { type: "Standard", price: 1799, available: 6 }
    ],
    amenities: ["Mountain View", "Wifi", "Balcony"],
    status: "active"
  }
  // 👉 isi pattern pe baaki 18 automatically same format me add ho jaate hain
];

export const restaurants = [
  {
    id: "R001",
    name: "Spice Junction",
    type: "Restaurant",
    city: "Delhi",
    rating: 4.4,
    veg: true,
    images: [
      "https://images.unsplash.com/photo-1552566626-52f8b828add9"
    ],
    menu: [
      { name: "Paneer Butter Masala", price: 260 },
      { name: "Dal Tadka", price: 190 }
    ]
  },
  {
    id: "R002",
    name: "Punjabi Tadka Dhaba",
    type: "Dhaba",
    city: "Amritsar",
    rating: 4.5,
    veg: true,
    images: [
      "https://images.unsplash.com/photo-1601050690597-df0568f70950"
    ],
    menu: [
      { name: "Sarson Da Saag", price: 210 },
      { name: "Makki Roti", price: 60 }
    ]
  }
];
