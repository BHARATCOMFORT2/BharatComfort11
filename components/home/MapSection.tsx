"use client";

import { useEffect } from "react";

export default function MapSection() {
  useEffect(() => {
    // Initialize map if using Mapbox or Google Maps
    // Example: Google Maps script already loaded in layout
  }, []);

  return (
    <section className="mt-12 bg-white shadow rounded-2xl p-6">
      <h2 className="text-2xl font-semibold mb-4">Explore on Map</h2>
      <div className="w-full h-96 rounded-xl bg-gray-200 flex items-center justify-center text-gray-500">
        🗺 Map integration here (e.g. Google Maps, Leaflet, Mapbox)
      </div>
    </section>
  );
}
