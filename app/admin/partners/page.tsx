// app/admin/partners/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Partner {
  id: string;
  name: string;
  email: string;
  status: "pending" | "approved" | "blocked";
}

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch partners
  useEffect(() => {
    const fetchPartners = async () => {
      const snapshot = await getDocs(collection(db, "partners"));
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Partner[];
      setPartners(data);
      setLoading(false);
    };

    fetchPartners();
  }, []);

  const updateStatus = async (id: string, status: "approved" | "blocked") => {
    await updateDoc(doc(db, "partners", id), { status });
    setPartners((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    );
  };

  const deletePartner = async (id: string) => {
    await deleteDoc(doc(db, "partners", id));
    setPartners((prev) => prev.filter((p) => p.id !== id));
  };

  if (loading) return <p className="p-4">Loading partners...</p>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Manage Partners</h1>
      {partners.length === 0 ? (
        <p>No partners found.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {partners.map((partner) => (
            <Card key={partner.id} className="shadow-md">
              <CardHeader>
                <CardTitle>{partner.name}</CardTitle>
                <p className="text-sm text-gray-500">{partner.email}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>
                  Status:{" "}
                  <span
                    className={`px-2 py-1 rounded text-white ${
                      partner.status === "approved"
                        ? "bg-green-500"
                        : partner.status === "blocked"
                        ? "bg-red-500"
                        : "bg-yellow-500"
                    }`}
                  >
                    {partner.status}
                  </span>
                </p>
                <div className="flex gap-2">
                  {partner.status !== "approved" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(partner.id, "approved")}
                    >
                      Approve
                    </Button>
                  )}
                  {partner.status !== "blocked" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateStatus(partner.id, "blocked")}
                    >
                      Block
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deletePartner(partner.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
