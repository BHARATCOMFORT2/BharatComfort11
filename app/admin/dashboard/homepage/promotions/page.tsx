"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

export default function PromotionsAdmin() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [newPromo, setNewPromo] = useState({
    title: "",
    description: "",
    imageUrl: "",
    link: "",
    active: true,
  });

  // Real-time load
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "homepage", "promotions", "items"),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPromotions(items);
      }
    );
    return () => unsub();
  }, []);

  const handleAdd = async () => {
    if (!newPromo.title) return alert("Please enter a title.");
    await addDoc(collection(db, "homepage", "promotions", "items"), {
      ...newPromo,
      createdAt: serverTimestamp(),
    });
    setNewPromo({ title: "", description: "", imageUrl: "", link: "", active: true });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this promotion?"))
      await deleteDoc(doc(db, "homepage", "promotions", "items", id));
  };

  const toggleActive = async (id: string, current: boolean) => {
    await updateDoc(doc(db, "homepage", "promotions", "items", id), {
      active: !current,
    });
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold text-yellow-800">
        Manage Homepage Promotions
      </h1>

      {/* Add New Promotion */}
      <div className="bg-white p-6 rounded-2xl shadow space-y-3">
        <h2 className="font-semibold text-lg">Add New Promotion</h2>
        <Input
          placeholder="Title"
          value={newPromo.title}
          onChange={(e) => setNewPromo({ ...newPromo, title: e.target.value })}
        />
        <Textarea
          placeholder="Description"
          value={newPromo.description}
          onChange={(e) =>
            setNewPromo({ ...newPromo, description: e.target.value })
          }
        />
        <Input
          placeholder="Image URL"
          value={newPromo.imageUrl}
          onChange={(e) => setNewPromo({ ...newPromo, imageUrl: e.target.value })}
        />
        <Input
          placeholder="Link URL (optional)"
          value={newPromo.link}
          onChange={(e) => setNewPromo({ ...newPromo, link: e.target.value })}
        />
        <Button onClick={handleAdd} className="w-full">
          Add Promotion
        </Button>
      </div>

      {/* Existing Promotions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {promotions.map((p) => (
          <div
            key={p.id}
            className="bg-white/80 rounded-2xl shadow p-4 space-y-2"
          >
            <img
              src={p.imageUrl}
              alt={p.title}
              className="w-full h-40 object-cover rounded-lg"
            />
            <h3 className="text-lg font-semibold">{p.title}</h3>
            <p className="text-sm text-gray-600">{p.description}</p>
            <div className="flex justify-between items-center pt-2">
              <Button
                variant="secondary"
                onClick={() => toggleActive(p.id, p.active)}
              >
                {p.active ? "Deactivate" : "Activate"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(p.id)}
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
