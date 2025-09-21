import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  Query,
  DocumentData,
  WhereFilterOp,
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
    const fetchPins = async () => {
      setLoading(true);

      try {
        const collectionRef = collection(db, "mapPins");

        // Dynamically build where clauses
        let q: Query<DocumentData> = collectionRef;

        if (filters && Object.keys(filters).length > 0) {
          const whereClauses = Object.entries(filters).map(
            ([field, [op, value]]) => where(field, op, value)
          );
          q = query(collectionRef, ...whereClauses);
        }

        const snapshot = await getDocs(q);

        const data: MapPin[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<MapPin, "id">),
        }));

        setPins(data);
      } catch (error) {
        console.error("Error fetching map pins:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPins();
  }, [filters]);

  return { pins, loading };
};
