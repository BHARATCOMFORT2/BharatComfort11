// hooks/useMapPins.ts
import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  Query,
  DocumentData,
  WhereFilterOp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface MapPin {
  id: string;
  type: string;
  referenceId: string;
  // Add other fields your map pin has
}

// Filter type: key = field name, value = [operator, value]
type MapPinFilters = {
  [field: string]: [WhereFilterOp, any];
};

export const useMapPins = (filters?: MapPinFilters) => {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);

    const collectionRef = collection(db, "mapPins");

    // Build dynamic query
    let q: Query<DocumentData> = collectionRef;
    if (filters && Object.keys(filters).length > 0) {
      const whereClauses = Object.entries(filters).map(
        ([field, [op, value]]) => where(field, op, value)
      );
      q = query(collectionRef, ...whereClauses);
    }

    // Listen to real-time updates
    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: MapPin[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<MapPin, "id">),
        }));
        setPins(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching map pins:", error);
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [filters]);

  return { pins, loading };
};
