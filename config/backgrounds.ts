// config/backgrounds.ts
export const backgrounds = {
  // 🌍 Page-level
  pages: {
    home: {
      image:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80",
      overlay: "bg-black/50",
    },
    listings: {
      image:
        "https://images.unsplash.com/photo-1502920917128-1aa500764b9e?auto=format&fit=crop&w=1920&q=80",
      overlay: "bg-gradient-to-r from-blue-900/60 to-blue-700/40",
    },
    about: {
      image:
        "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=1920&q=80",
      overlay:
        "bg-gradient-to-b from-gray-900/70 via-gray-800/40 to-gray-900/70",
    },
    partners: {
      image:
        "https://images.unsplash.com/photo-1504691342899-8d2d2d4e87ed?auto=format&fit=crop&w=1920&q=80",
      overlay: "bg-gradient-to-r from-orange-600/70 to-orange-400/50",
    },
    stories: {
      image:
        "https://images.unsplash.com/photo-1473625247510-8ceb1760943f?auto=format&fit=crop&w=1920&q=80",
      overlay: "bg-gradient-to-t from-black/70 via-black/40 to-transparent",
    },
  },

  // 📌 Section-level (inside pages)
  sections: {
    hero: {
      image:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80",
      overlay: "bg-gradient-to-b from-black/70 via-black/50 to-black/70",
    },
    quickActions: {
      image:
        "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1920&q=80",
      overlay: "bg-gradient-to-r from-blue-900/80 to-blue-600/60",
    },
    featuredListings: {
      image:
        "https://images.unsplash.com/photo-1501117716987-c8e1ecb2105d?auto=format&fit=crop&w=1920&q=80",
      overlay:
        "bg-gradient-to-b from-gray-900/80 via-gray-700/50 to-gray-900/80",
    },
  },
};
