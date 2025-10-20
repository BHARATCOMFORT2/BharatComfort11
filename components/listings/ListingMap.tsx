"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
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

interface ListingMapProps {
  listings: Listing[];
}

export default function ListingMap({ listings }: ListingMapProps) {
  // ✅ Default to India's center if no listings
  const defaultCenter: [number, number] = [20.5937, 78.9629];

  // ✅ Safe fallback for center
  const firstValid = listings.find(
    (l) => typeof l.lat === "number" && typeof l.lng === "number"
  );

  const center: [number, number] = firstValid
    ? [firstValid.lat as number, firstValid.lng as number]
    : defaultCenter;

  return (
    <MapContainer
      center={center}
      zoom={5}
      className="h-full w-full rounded-lg"
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {listings.map((listing) => {
        // ✅ Safely skip invalid coordinates
        if (
          typeof listing.lat !== "number" ||
          typeof listing.lng !== "number"
        )
          return null;

        return (
          <Marker
            key={listing.id}
            position={[listing.lat, listing.lng] as [number, number]}
          >
            <Popup>
              <div>
                <h3 className="font-semibold">{listing.name}</h3>
                <p>{listing.location}</p>
                <p className="text-sm">₹{listing.price}</p>
                <p className="text-yellow-600 text-sm">⭐ {listing.rating}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
