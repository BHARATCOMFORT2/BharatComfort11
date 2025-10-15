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

export default function FeaturedListingsEditor() {
  const [listings, setListings] = useState<
    { id?: string; title: string; price: number; imageUrl: string; location: string }[]
  >([]);

  const [newListing, setNewListing] = useState({
    title: "",
    price: 0,
    imageUrl: "",
    location: "",
  });

  // Fetch featured listings in real-time
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "homepage", "featured", "items"),
      (snap) => {
        setListings(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      }
    );
    return () => unsub();
  }, []);

  // Add listing
  const handleAdd = async () => {
    if (!newListing.title.trim()) return alert("Enter a title!");
    await addDoc(collection(db, "homepage", "featured", "items"), newListing);
    setNewListing({ title: "", price: 0, imageUrl: "", location: "" });
  };

  // Update listing
  const handleUpdate = async (id: string, updated: any) => {
    await updateDoc(doc(db, "homepage", "featured", "items", id), updated);
  };

  // Delete listing
  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "homepage", "featured", "items", id));
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Manage Featured Listings</h1>

      {/* Add new listing */}
      <div className="space-y-2 border-b pb-4">
        <Input
          placeholder="Listing Title"
          value={newListing.title}
          onChange={(e) =>
            setNewListing({ ...newListing, title: e.target.value })
          }
        />
        <Input
          placeholder="Location"
          value={newListing.location}
          onChange={(e) =>
            setNewListing({ ...newListing, location: e.target.value })
          }
        />
        <Input
          type="number"
          placeholder="Price"
          value={newListing.price}
          onChange={(e) =>
            setNewListing({ ...newListing, price: Number(e.target.value) })
          }
        />
        <Input
          placeholder="Image URL"
          value={newListing.imageUrl}
          onChange={(e) =>
            setNewListing({ ...newListing, imageUrl: e.target.value })
          }
        />
        <Button onClick={handleAdd}>Add Listing</Button>
      </div>

      {/* Display existing listings */}
      <div className="grid gap-4">
        {listings.map((item) => (
          <div
            key={item.id}
            className="border p-4 rounded-lg bg-white/50 shadow-sm space-y-2"
          >
            <Input
              value={item.title}
              onChange={(e) =>
                handleUpdate(item.id!, { ...item, title: e.target.value })
              }
            />
            <Input
              value={item.location}
              onChange={(e) =>
                handleUpdate(item.id!, { ...item, location: e.target.value })
              }
            />
            <Input
              type="number"
              value={item.price}
              onChange={(e) =>
                handleUpdate(item.id!, {
                  ...item,
                  price: Number(e.target.value),
                })
              }
            />
            <Input
              value={item.imageUrl}
              onChange={(e) =>
                handleUpdate(item.id!, { ...item, imageUrl: e.target.value })
              }
            />
            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={() => handleDelete(item.id!)}
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
