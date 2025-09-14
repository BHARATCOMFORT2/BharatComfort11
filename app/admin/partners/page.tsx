"use client";

import React, { useState } from "react";
import { usePendingPartners } from "@/hooks/usePendingPartners";
import { useAuth } from "@/hooks/useAuth"; // assume you have this
import { getAuth } from "firebase/auth";

export default function AdminPartnersPage() {
  const { partners, loading } = usePendingPartners();
  const [busyFor, setBusyFor] = useState<string | null>(null);

  // helper to get ID token and call secure API
  async function callAdminApi(path: string, body: any) {
    const auth = (await import("@/lib/firebase")).auth; // client auth
    const token = await auth.currentUser?.getIdToken(true);
    const res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async function approve(partnerId: string) {
    setBusyFor(partnerId);
    try {
      const resp = await callAdminApi("/api/admin/partners/approve", { partnerId });
      if (resp.success) {
        alert("Partner approved.");
      } else {
        alert("Error: " + (resp.error || "Unknown"));
      }
    } catch (err) {
      console.error(err);
      alert("Request failed");
    } finally {
      setBusyFor(null);
    }
  }

  async function reject(partnerId: string) {
    const reason = prompt("Enter rejection reason (optional):") || "";
    setBusyFor(partnerId);
    try {
      const resp = await callAdminApi("/api/admin/partners/reject", { partnerId, reason });
      if (resp.success) {
        alert("Partner rejected.");
      } else {
        alert("Error: " + (resp.error || "Unknown"));
      }
    } catch (err) {
      console.error(err);
      alert("Request failed");
    } finally {
      setBusyFor(null);
    }
  }

  if (loading) return <p className="p-6">Loading pending partners…</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Pending Partners (Approve / Reject)</h1>
      {partners.length === 0 ? (
        <p>No pending partners.</p>
      ) : (
        <ul className="space-y-4">
          {partners.map((p) => (
            <li key={p.id} className="bg-white p-4 rounded shadow flex justify-between items-start">
              <div>
                <p className="font-semibold">{p.name || p.id}</p>
                <p className="text-sm text-gray-600">{p.email}</p>
                <p className="text-sm text-gray-600">{p.phone}</p>
                <p className="text-xs text-gray-400">Requested: {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleString() : p.createdAt}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => approve(p.id)}
                  disabled={busyFor === p.id}
                  className="px-3 py-2 bg-green-600 text-white rounded"
                >
                  {busyFor === p.id ? "Working…" : "Approve"}
                </button>

                <button
                  onClick={() => reject(p.id)}
                  disabled={busyFor === p.id}
                  className="px-3 py-2 bg-red-600 text-white rounded"
                >
                  {busyFor === p.id ? "Working…" : "Reject"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function AdminPartnersPage() {
  const router = useRouter();
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPartners = async () => {
    try {
      const snap = await getDocs(collection(db, "partners"));
      const list: any[] = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setPartners(list);
    } catch (err) {
      console.error("Error fetching partners:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push("/auth/login");
      return;
    }
    // TODO: enforce superadmin check
    fetchPartners();
  }, [router]);

  const removePartner = async (id: string) => {
    try {
      await deleteDoc(doc(db, "partners", id));
      setPartners((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Error removing partner:", err);
    }
  };

  const changeStatus = async (id: string, status: string) => {
    try {
      const ref = doc(db, "partners", id);
      await updateDoc(ref, { status });
      setPartners((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status } : p))
      );
    } catch (err) {
      console.error("Error updating partner status:", err);
    }
  };

  if (loading) return <p className="text-center py-12">Loading partners...</p>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Manage Partners</h1>

      {partners.length > 0 ? (
        <table className="w-full border-collapse border rounded-lg overflow-hidden shadow">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2 text-left">Name</th>
              <th className="border px-4 py-2 text-left">Email</th>
              <th className="border px-4 py-2 text-left">Status</th>
              <th className="border px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((partner) => (
              <tr key={partner.id} className="bg-white hover:bg-gray-50">
                <td className="border px-4 py-2">{partner.name}</td>
                <td className="border px-4 py-2">{partner.email}</td>
                <td className="border px-4 py-2">
                  <select
                    value={partner.status || "pending"}
                    onChange={(e) => changeStatus(partner.id, e.target.value)}
                    className="border px-2 py-1 rounded"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </td>
                <td className="border px-4 py-2 text-center">
                  <button
                    onClick={() => removePartner(partner.id)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-500">No partners found.</p>
      )}
    </div>
  );
}
