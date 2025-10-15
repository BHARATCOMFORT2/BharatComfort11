"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function TrendingDestinationsEditor() {
  const [destinations, setDestinations] = useState<
    { id?: string; name: string; description: string; imageUrl: string }[]
  >([]);

  const [newDestination, setNewDestination] = useState({
    name: "",
    description: "",
    imageUrl: "",
  });

  // Fetch all trending destinations in real-time
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "homepage", "trending", "items"),
      (snap) => {
        setDestinations(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        );
      }
    );
    return () => unsub();
  }, []);

  // Add new destination
  const handleAdd = async () => {
    if (!newDestination.name.trim()) return alert("Enter a name!");
    await addDoc(collection(db, "homepage", "trending", "items"), newDestination);
    setNewDestination({ name: "", description: "", imageUrl: "" });
  };

  // Update destination
  const handleUpdate = async (id: string, updated: any) => {
    await updateDoc(doc(db, "homepage", "trending", "items", id), updated);
  };

  // Delete destination
  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "homepage", "trending", "items", id));
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Manage Trending Destinations</h1>

      {/* Add new destination */}
      <div className="space-y-2 border-b pb-4">
        <Input
          placeholder="Destination Name"
          value={newDestination.name}
          onChange={(e) =>
            setNewDestination({ ...newDestination, name: e.target.value })
          }
        />
        <Input
          placeholder="Description"
          value={newDestination.description}
          onChange={(e) =>
            setNewDestination({ ...newDestination, description: e.target.value })
          }
        />
        <Input
          placeholder="Image URL"
          value={newDestination.imageUrl}
          onChange={(e) =>
            setNewDestination({ ...newDestination, imageUrl: e.target.value })
          }
        />
        <Button onClick={handleAdd}>Add Destination</Button>
      </div>

      {/* List existing destinations */}
      <div className="grid gap-4">
        {destinations.map((dest) => (
          <div
            key={dest.id}
            className="border p-4 rounded-lg bg-white/50 shadow-sm space-y-2"
          >
            <Input
              value={dest.name}
              onChange={(e) =>
                handleUpdate(dest.id!, { ...dest, name: e.target.value })
              }
            />
            <Input
              value={dest.description}
              onChange={(e) =>
                handleUpdate(dest.id!, { ...dest, description: e.target.value })
              }
            />
            <Input
              value={dest.imageUrl}
              onChange={(e) =>
                handleUpdate(dest.id!, { ...dest, imageUrl: e.target.value })
              }
            />
            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={() => handleDelete(dest.id!)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
