// app/admin/dashboard/partners/page.tsx
"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, updateDoc, doc } from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { getIdToken } from "firebase/auth";

type Partner = {
  id: string;
  name?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  status?: "pending" | "approved" | "rejected";
  createdAt?: any;
};

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "partners"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list: Partner[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as any;
      setPartners(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleApproval = async (id: string, action: "approve" | "reject") => {
    try {
      const user = auth.currentUser;
      if (!user) return alert("Admin not authenticated.");
      const token = await getIdToken(user, true);

      const res = await fetch(`/api/admin/partners/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ partnerId: id, action }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update partner");
      }
      alert(`Partner ${action}d successfully.`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Action failed");
    }
  };

  return (
    <DashboardLayout title="Admin • Manage Partners">
      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Partner Accounts</h2>
          <span className="text-sm text-gray-500">
            Total: {partners.length}
          </span>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-12">Loading partners…</p>
        ) : partners.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No partners found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 text-left text-sm font-semibold text-gray-700">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {partners.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{p.name || "—"}</td>
                    <td className="px-4 py-3">{p.businessName || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{p.email || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          p.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : p.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {p.status || "pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {p.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleApproval(p.id, "approve")}
                            className="rounded-lg bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleApproval(p.id, "reject")}
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
