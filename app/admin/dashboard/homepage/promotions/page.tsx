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

export default function PromotionsEditor() {
  const [promotions, setPromotions] = useState<
    { id?: string; title: string; description: string; imageUrl: string }[]
  >([]);
  const [newPromo, setNewPromo] = useState({
    title: "",
    description: "",
    imageUrl: "",
  });

  // Fetch all promotions in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "homepage", "promotions", "items"), (snap) => {
      setPromotions(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      );
    });
    return () => unsub();
  }, []);

  // Add new promotion
  const handleAdd = async () => {
    if (!newPromo.title.trim()) return alert("Enter title!");
    await addDoc(collection(db, "homepage", "promotions", "items"), newPromo);
    setNewPromo({ title: "", description: "", imageUrl: "" });
  };

  // Update promotion
  const handleUpdate = async (id: string, updated: any) => {
    await updateDoc(doc(db, "homepage", "promotions", "items", id), updated);
  };

  // Delete promotion
  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "homepage", "promotions", "items", id));
  };

  return (
    <div className="p-8 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">Manage Promotions</h1>

      {/* Add new promo */}
      <div className="space-y-2 border-b pb-4">
        <Input
          placeholder="Title"
          value={newPromo.title}
          onChange={(e) => setNewPromo({ ...newPromo, title: e.target.value })}
        />
        <Input
          placeholder="Description"
          value={newPromo.description}
          onChange={(e) => setNewPromo({ ...newPromo, description: e.target.value })}
        />
        <Input
          placeholder="Image URL"
          value={newPromo.imageUrl}
          onChange={(e) => setNewPromo({ ...newPromo, imageUrl: e.target.value })}
        />
        <Button onClick={handleAdd}>Add Promotion</Button>
      </div>

      {/* Existing promotions */}
      <div className="grid gap-4">
        {promotions.map((promo) => (
          <div
            key={promo.id}
            className="border p-4 rounded-lg shadow-sm bg-white/50 space-y-2"
          >
            <Input
              value={promo.title}
              onChange={(e) =>
                handleUpdate(promo.id!, { ...promo, title: e.target.value })
              }
            />
            <Input
              value={promo.description}
              onChange={(e) =>
                handleUpdate(promo.id!, { ...promo, description: e.target.value })
              }
            />
            <Input
              value={promo.imageUrl}
              onChange={(e) =>
                handleUpdate(promo.id!, { ...promo, imageUrl: e.target.value })
              }
            />
            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={() => handleDelete(promo.id!)}
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
