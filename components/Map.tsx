"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";

// ✅ Fix Leaflet icon issue for production builds
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapProps {
  lat?: number;
  lng?: number;
  zoom?: number;
}

/**
 * ✅ Safe Map component that renders only when coordinates are valid
 */
export default function Map({ lat, lng, zoom = 11 }: MapProps) {
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    // ✅ Only render map if both lat/lng are numbers and within valid range
    if (
      typeof lat === "number" &&
      typeof lng === "number" &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      setIsValid(true);
    } else {
      console.warn("⚠️ Invalid or missing coordinates:", { lat, lng });
      setIsValid(false);
    }
  }, [lat, lng]);

  if (!isValid) {
    return (
      <div className="flex items-center justify-center text-gray-500 h-full">
        📍 Location not available
      </div>
    );
  }

  return (
    <MapContainer
      center={[lat!, lng!]}
      zoom={zoom}
      style={{ height: "100%", width: "100%", borderRadius: "12px" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={[lat!, lng!]}>
        <Popup>Location</Popup>
      </Marker>
    </MapContainer>
  );
}
