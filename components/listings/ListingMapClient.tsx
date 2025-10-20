"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { Listing } from "./ListingCard";

// ✅ Fix Leaflet marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface ListingMapClientProps {
  listings: Listing[];
}

/* ---------------------------------------------------------
 ✅ Helper Component: Automatically fit map bounds to markers
---------------------------------------------------------- */
function FitMapBounds({ listings }: { listings: Listing[] }) {
  const map = useMap();

  useEffect(() => {
    const validPoints = listings
      .filter(
        (l) => typeof l.lat === "number" && typeof l.lng === "number"
      )
      .map((l) => [l.lat as number, l.lng as number]) as [number, number][];

    if (validPoints.length === 0) return;

    // ✅ Fit map to show all markers nicely
    const bounds = L.latLngBounds(validPoints);
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [listings, map]);

  return null;
}

/* ---------------------------------------------------------
 ✅ Main Map Component
---------------------------------------------------------- */
export default function ListingMapClient({ listings }: ListingMapClientProps) {
  const defaultCenter: [number, number] = [20.5937, 78.9629]; // India

  // ✅ Find first valid point for initial render
  const firstValid = listings.find(
    (l) => typeof l.lat === "number" && typeof l.lng === "number"
  );

  const mapCenter: [number, number] = firstValid
    ? [firstValid.lat as number, firstValid.lng as number]
    : defaultCenter;

  return (
    <MapContainer
      center={mapCenter}
      zoom={5}
      className="h-full w-full rounded-lg"
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* ✅ Auto-fit map bounds dynamically */}
      <FitMapBounds listings={listings} />

      {/* ✅ Render all markers safely */}
      {listings
        .filter(
          (l) => typeof l.lat === "number" && typeof l.lng === "number"
        )
        .map((listing) => (
          <Marker
            key={listing.id}
            position={[listing.lat as number, listing.lng as number]}
          >
            <Popup>
              <div className="min-w-[150px]">
                <h3 className="font-semibold">{listing.name}</h3>
                <p>{listing.location}</p>
                <p className="text-sm text-blue-600 font-medium">
                  ₹{listing.price}
                </p>
                <p className="text-yellow-600 text-sm">⭐ {listing.rating}</p>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
