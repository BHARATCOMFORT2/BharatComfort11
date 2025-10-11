"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import dynamic from "next/dynamic";

// ✅ Dynamically import Map (so it only loads client-side)
const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function DestinationDetailPage() {
  const { id } = useParams();
  const [destination, setDestination] = useState<any>(null);
  const [stays, setStays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        // ✅ Fetch destination details
        const destRef = doc(db, "destinations", id as string);
        const destSnap = await getDoc(destRef);

        if (destSnap.exists()) {
          const destData = { id: destSnap.id, ...destSnap.data() };
          setDestination(destData);

          // ✅ Fetch stays linked to this destination
          const staysRef = collection(db, "stays");
          const q = query(staysRef, where("destinationId", "==", id));
          const staySnap = await getDocs(q);

          const staysData = staySnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setStays(staysData);
        } else {
          setDestination(null);
        }
      } catch (err) {
        console.error("Error loading destination:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading)
    return (
      <div className="min-h-screen flex justify-center items-center text-gray-600">
        Loading destination details...
      </div>
    );

  if (!destination)
    return (
      <div className="min-h-screen flex justify-center items-center text-gray-600">
        Destination not found.
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-yellow-900 mb-4">
          {destination.title || "Untitled Destination"}
        </h1>
        <p className="text-gray-700">{destination.description || "No description available."}</p>
      </div>

      {/* Image */}
      {destination.image && (
        <img
          src={destination.image}
          alt={destination.title}
          className="w-full h-[400px] object-cover rounded-2xl shadow-md"
        />
      )}

      {/* Map */}
      {destination.lat && destination.lng ? (
        <div className="rounded-2xl overflow-hidden h-[350px] shadow-md">
          <Map lat={destination.lat} lng={destination.lng} zoom={11} />
        </div>
      ) : (
        <p className="text-gray-500">Location data not available.</p>
      )}

      {/* Stays List */}
      <div>
        <h2 className="text-2xl font-semibold text-yellow-900 mb-3">
          Stays in {destination.title}
        </h2>
        {stays.length === 0 ? (
          <p className="text-gray-500">No stays found for this destination.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stays.map((stay) => (
              <div
                key={stay.id}
                className="bg-white rounded-2xl shadow hover:shadow-lg transition p-4"
              >
                <img
                  src={stay.image || "/placeholder.jpg"}
                  alt={stay.name}
                  className="rounded-xl h-40 w-full object-cover mb-3"
                />
                <h3 className="text-lg font-semibold text-yellow-900">{stay.name}</h3>
                <p className="text-gray-600 text-sm">
                  {stay.address || "No address provided"}
                </p>
                <p className="text-yellow-800 font-semibold mt-2">
                  ₹{stay.price || "N/A"} / night
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
