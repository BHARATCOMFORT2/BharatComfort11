// app/admin/dashboard/disputes/page.tsx
"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  where,
} from "firebase/firestore";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";

type Dispute = {
  id: string;
  partnerId: string;
  partnerName?: string;
  amount?: number;
  remark?: string;
  status?: "pending" | "resolved" | "rejected";
  createdAt?: any;
};

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "settlements"),
      where("hasDispute", "==", true),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: Dispute[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as any;
      setDisputes(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAction = async (id: string, action: "resolve" | "reject") => {
    try {
      const user = auth.currentUser;
      if (!user) return alert("Admin not authenticated.");
      const token = await getIdToken(user, true);

      const res = await fetch(`/api/settlements/disputes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settlementId: id, action }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Action failed");
      }
      alert(`Dispute ${action}d successfully.`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update dispute.");
    }
  };

  return (
    <DashboardLayout title="Admin • Disputes Management">
      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            Settlement Disputes
          </h2>
          <span className="text-sm text-gray-500">
            Total: {disputes.length}
          </span>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-12">Loading disputes…</p>
        ) : disputes.length === 0 ? (
          <p className="text-center text-gray-500 py-12">
            No active disputes found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 text-left text-sm font-semibold text-gray-700">
                <tr>
                  <th className="px-4 py-3">Settlement ID</th>
                  <th className="px-4 py-3">Partner</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Remark</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {disputes.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800">
                      #{d.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      {d.partnerName || "—"}
                    </td>
                    <td className="px-4 py-3">
                      ₹{(d.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {d.remark || "No details"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                          d.status === "resolved"
                            ? "bg-green-100 text-green-700"
                            : d.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {d.status || "pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {d.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleAction(d.id, "resolve")}
                            className="rounded-lg bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => handleAction(d.id, "reject")}
                            className="rounded-lg bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
