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
  orderBy,
  query,
} from "firebase/firestore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function QuickActionsEditor() {
  const [actions, setActions] = useState<
    { id?: string; label: string; link: string; icon: string; order: number }[]
  >([]);

  const [newAction, setNewAction] = useState({
    label: "",
    link: "",
    icon: "",
    order: 0,
  });

  // Fetch real-time actions list
  useEffect(() => {
    const q = query(
      collection(db, "homepage", "quickactions", "items"),
      orderBy("order", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setActions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, []);

  // Add new action
  const handleAdd = async () => {
    if (!newAction.label.trim()) return alert("Enter a label!");
    await addDoc(collection(db, "homepage", "quickactions", "items"), newAction);
    setNewAction({ label: "", link: "", icon: "", order: 0 });
  };

  // Update existing
  const handleUpdate = async (id: string, updated: any) => {
    await updateDoc(doc(db, "homepage", "quickactions", "items", id), updated);
  };

  // Delete
  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "homepage", "quickactions", "items", id));
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Manage Quick Action Buttons</h1>

      {/* Add new */}
      <div className="space-y-2 border-b pb-4">
        <Input
          placeholder="Label (e.g. Explore)"
          value={newAction.label}
          onChange={(e) => setNewAction({ ...newAction, label: e.target.value })}
        />
        <Input
          placeholder="Link (e.g. /explore)"
          value={newAction.link}
          onChange={(e) => setNewAction({ ...newAction, link: e.target.value })}
        />
        <Input
          placeholder="Icon (Lucide name, e.g. Plane, Hotel, MapPin)"
          value={newAction.icon}
          onChange={(e) => setNewAction({ ...newAction, icon: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Order"
          value={newAction.order}
          onChange={(e) =>
            setNewAction({ ...newAction, order: Number(e.target.value) })
          }
        />
        <Button onClick={handleAdd}>Add Action</Button>
      </div>

      {/* List existing */}
      <div className="grid gap-4">
        {actions.map((a) => (
          <div
            key={a.id}
            className="border p-4 rounded-lg bg-white/50 shadow-sm space-y-2"
          >
            <Input
              value={a.label}
              onChange={(e) =>
                handleUpdate(a.id!, { ...a, label: e.target.value })
              }
            />
            <Input
              value={a.link}
              onChange={(e) =>
                handleUpdate(a.id!, { ...a, link: e.target.value })
              }
            />
            <Input
              value={a.icon}
              onChange={(e) =>
                handleUpdate(a.id!, { ...a, icon: e.target.value })
              }
            />
            <Input
              type="number"
              value={a.order}
              onChange={(e) =>
                handleUpdate(a.id!, { ...a, order: Number(e.target.value) })
              }
            />
            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={() => handleDelete(a.id!)}
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
