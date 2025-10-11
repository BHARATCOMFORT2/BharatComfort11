"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Map from "@/app/components/Map";
import Loading from "@/app/components/Loading";

export default function DestinationPage() {
  const params = useParams();
  const destinationId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [destination, setDestination] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!destinationId) return;

    const fetchDestination = async () => {
      try {
        const docRef = doc(db, "destinations", destinationId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setDestination({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        console.error("Error fetching destination:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDestination();
  }, [destinationId]);

  if (loading) return <Loading message="Loading destination..." />;
  if (!destination) return <div className="text-center mt-10 text-gray-500">Destination not found.</div>;

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <h1 className="text-3xl font-bold mb-2">{destination.title}</h1>
      <p className="text-gray-600 mb-4">{destination.state}</p>
      <p className="text-gray-700 mb-6">{destination.description}</p>

      {destination.lat && destination.lng ? (
        <div className="rounded-2xl overflow-hidden h-[350px] shadow-md">
          <Map lat={destination.lat} lng={destination.lng} zoom={11} />
        </div>
      ) : (
        <p className="text-gray-500">Location data not available.</p>
      )}
    </div>
  );
}
