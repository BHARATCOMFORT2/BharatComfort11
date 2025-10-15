"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function QuickActionsEditor() {
  const [actions, setActions] = useState<{ label: string; href: string; icon: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const snap = await getDoc(doc(db, "homepage", "quickActions"));
      if (snap.exists()) setActions(snap.data().actions || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleChange = (index: number, key: string, value: string) => {
    const newActions = [...actions];
    newActions[index][key as keyof typeof newActions[0]] = value;
    setActions(newActions);
  };

  const handleSave = async () => {
    await updateDoc(doc(db, "homepage", "quickActions"), { actions });
    alert("✅ Quick Actions updated!");
  };

  if (loading) return <p className="text-center py-12">Loading...</p>;

  return (
    <DashboardLayout title="Edit Quick Actions" profile={{ name: "Admin", role: "admin" }}>
      <div className="space-y-6">
        {actions.map((a, i) => (
          <div key={i} className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded shadow">
            <input
              type="text"
              value={a.label}
              onChange={(e) => handleChange(i, "label", e.target.value)}
              placeholder="Label"
              className="border p-2 rounded flex-1"
            />
            <input
              type="text"
              value={a.href}
              onChange={(e) => handleChange(i, "href", e.target.value)}
              placeholder="Link"
              className="border p-2 rounded flex-1"
            />
            <input
              type="text"
              value={a.icon}
              onChange={(e) => handleChange(i, "icon", e.target.value)}
              placeholder="Icon (Plane/Train/Bus/Hotel)"
              className="border p-2 rounded flex-1"
            />
          </div>
        ))}
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-yellow-700 text-white rounded hover:bg-yellow-800"
        >
          Save Changes
        </button>
      </div>
    </DashboardLayout>
  );
}
