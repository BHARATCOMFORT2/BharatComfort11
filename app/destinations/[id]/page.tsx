"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

// Dynamically import Map component to avoid SSR issues
const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function DestinationDetailsPage() {
  const params = useParams();
  const destinationId = params?.id;
  const [destination, setDestination] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch destination details
  useEffect(() => {
    if (!destinationId) return;

    const fetchDestination = async () => {
      try {
        const docRef = doc(db, "destinations", destinationId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setDestination({ id: docSnap.id, ...docSnap.data() });
      } catch (err) {
        console.error("Error fetching destination:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDestination();
  }, [destinationId]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading destination...
      </div>
    );

  if (!destination)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Destination not found.
      </div>
    );

  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6 max-w-4xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Destination Image */}
      <div className="rounded-2xl overflow-hidden shadow-md mb-6">
        <img
          src={destination.image || "/placeholder.jpg"}
          alt={destination.title}
          className="w-full h-64 object-cover"
        />
      </div>

      {/* Title and Description */}
      <h1 className="text-3xl font-bold text-yellow-900 mb-2">{destination.title}</h1>
      {destination.state && <p className="text-gray-600 mb-4">{destination.state}</p>}
      {destination.description && (
        <p className="text-gray-700 mb-6">{destination.description}</p>
      )}

      {/* Map */}
      {destination.lat && destination.lng ? (
        <div className="rounded-2xl overflow-hidden h-[350px] shadow-md mb-6">
          <Map lat={destination.lat} lng={destination.lng} zoom={11} />
        </div>
      ) : (
        <p className="text-gray-500 mb-6">Location data not available.</p>
      )}
    </motion.div>
  );
}
