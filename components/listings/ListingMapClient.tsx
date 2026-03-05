"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import type { Listing } from "./ListingCard";

/* -------------------------------------------------
   Fix Leaflet marker icons in Next.js
-------------------------------------------------- */

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

/* -------------------------------------------------
   Helper: Auto fit map bounds to markers
-------------------------------------------------- */

function FitMapBounds({ listings }: { listings: Listing[] }) {
  const map = useMap();

  useEffect(() => {
    const validPoints = listings
      .filter((l) => typeof l.lat === "number" && typeof l.lng === "number")
      .map((l) => [l.lat as number, l.lng as number]) as [number, number][];

    if (validPoints.length === 0) return;

    const bounds = L.latLngBounds(validPoints);

    map.fitBounds(bounds, {
      padding: [60, 60],
      maxZoom: 14,
    });
  }, [listings, map]);

  return null;
}

/* -------------------------------------------------
   Main Map Component
-------------------------------------------------- */

export default function ListingMapClient({
  listings,
}: ListingMapClientProps) {
  const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629]; // India center

  const validListings = listings.filter(
    (l) => typeof l.lat === "number" && typeof l.lng === "number"
  );

  const mapCenter: [number, number] =
    validListings.length > 0
      ? [validListings[0].lat as number, validListings[0].lng as number]
      : DEFAULT_CENTER;

  return (
    <MapContainer
      center={mapCenter}
      zoom={5}
      className="h-full w-full rounded-xl"
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Auto-fit markers */}
      <FitMapBounds listings={validListings} />

      {/* Render markers */}
      {validListings.map((listing) => (
        <Marker
          key={listing.id}
          position={[listing.lat as number, listing.lng as number]}
        >
          <Popup>
            <div className="min-w-[180px] space-y-1">
              <h3 className="font-semibold text-gray-800">
                {listing.name}
              </h3>

              <p className="text-sm text-gray-500">
                {listing.location}
              </p>

              <p className="text-sm font-semibold text-blue-600">
                ₹{listing.price}
              </p>

              {listing.rating && (
                <p className="text-sm text-yellow-600">
                  ⭐ {listing.rating}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
