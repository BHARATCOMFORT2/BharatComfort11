"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

interface Listing {
  id: string;
  name: string;
  category: string;
  location: string;
  price: string;
  rating: number;
  image: string;
  lat?: number; // optional now
  lng?: number; // optional now
}

interface ListingMapProps {
  listings: Listing[];
}

const defaultCenter: [number, number] = [20.5937, 78.9629]; // India center

// Custom marker icon
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function ListingMap({ listings }: ListingMapProps) {
  return (
    <MapContainer
      center={
        listings.length > 0 && listings[0].lat && listings[0].lng
          ? [listings[0].lat, listings[0].lng]
          : defaultCenter
      }
      zoom={5}
      className="w-full h-full rounded-lg"
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; <a href='https://www.openstreetmap.org/'>OpenStreetMap</a> contributors"
      />

      {listings
        .filter((l) => l.lat && l.lng)
        .map((listing) => (
          <Marker
            key={listing.id}
            position={[listing.lat!, listing.lng!]}
            icon={markerIcon}
          >
            <Popup>
              <div className="text-sm">
                <strong>{listing.name}</strong>
                <br />
                {listing.location}
                <br />
                ₹{listing.price} • ⭐ {listing.rating}
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
