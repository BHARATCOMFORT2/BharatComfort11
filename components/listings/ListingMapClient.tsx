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

interface ListingMapClientProps {
  listings: Listing[];
}

export default function ListingMapClient({ listings }: ListingMapClientProps) {
  const defaultCenter: [number, number] = [20.5937, 78.9629]; // India center

  return (
    <MapContainer
      center={
        listings.length > 0
          ? [listings[0].lat, listings[0].lng]
          : defaultCenter
      }
      zoom={5}
      className="h-full w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {listings.map((listing) => (
        <Marker key={listing.id} position={[listing.lat, listing.lng]}>
          <Popup>
            <div>
              <h3 className="font-semibold">{listing.name}</h3>
              <p>{listing.location}</p>
              <p className="text-sm">₹{listing.price}</p>
              <p className="text-yellow-600 text-sm">⭐ {listing.rating}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
