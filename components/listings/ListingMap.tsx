"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Listing } from "./ListingCard";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* Fix leaflet icons */

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface ListingMapProps {
  listings: Listing[];
}

/* Auto fit map bounds */

function FitBounds({ listings }: { listings: Listing[] }) {
  const map = useMap();

  useEffect(() => {
    const valid = listings.filter(
      (l) => typeof l.lat === "number" && typeof l.lng === "number"
    );

    if (valid.length === 0) return;

    const bounds = L.latLngBounds(
      valid.map((l) => [l.lat as number, l.lng as number])
    );

    map.fitBounds(bounds, { padding: [40, 40] });
  }, [listings, map]);

  return null;
}

export default function ListingMap({ listings }: ListingMapProps) {

  const router = useRouter();

  const defaultCenter: [number, number] = [20.5937, 78.9629];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={5}
      className="h-full w-full rounded-lg"
      scrollWheelZoom={true}
    >

      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Auto fit bounds */}
      <FitBounds listings={listings} />

      {listings.map((listing) => {

        if (
          typeof listing.lat !== "number" ||
          typeof listing.lng !== "number"
        )
          return null;

        return (
          <Marker
            key={listing.id}
            position={[listing.lat, listing.lng]}
          >
            <Popup>

              <div className="space-y-1">

                <h3 className="font-semibold text-sm">
                  {listing.name}
                </h3>

                <p className="text-xs text-gray-600">
                  {listing.location}
                </p>

                <p className="text-xs font-semibold">
                  ₹{listing.price}
                </p>

                {listing.rating && (
                  <p className="text-yellow-600 text-xs">
                    ⭐ {listing.rating}
                  </p>
                )}

                <button
                  onClick={() => router.push(`/listing/${listing.id}`)}
                  className="text-blue-600 text-xs underline"
                >
                  View details
                </button>

              </div>

            </Popup>
          </Marker>
        );
      })}

    </MapContainer>
  );
}
