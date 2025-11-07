// app/partner/settlements/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function PartnerSettlementsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [disputeModal, setDisputeModal] = useState<{ open: boolean; id?: string }>({
    open: false,
  });
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDesc, setDisputeDesc] = useState("");

  // -------------------- Auth --------------------
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        router.push("/auth/login");
        return;
      }
      setUser(currentUser);
    });
    return () => unsub();
  }, [router]);

  // -------------------- Fetch Settlements --------------------
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "settlements"),
      where("partnerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSettlements(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Settlement fetch error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  // -------------------- Dispute Action --------------------
  const submitDispute = async () => {
    if (!user || !disputeModal.id || !disputeReason) {
      alert("Please enter a reason for dispute.");
      return;
    }

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/settlements/dispute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          settlementId: disputeModal.id,
          reason: disputeReason,
          description: disputeDesc,
        }),
      });
      const data = await res.json();

      if (data.success) {
        alert("✅ Dispute raised successfully.");
        setDisputeModal({ open: false });
        setDisputeReason("");
        setDisputeDesc("");
      } else {
        alert("❌ Failed to raise dispute: " + (data.error || ""));
      }
    } catch (err) {
      console.error("Dispute error:", err);
      alert("Failed to submit dispute.");
    }
  };

  if (loading)
    return <p className="py-12 text-center text-gray-600">Loading your settlements…</p>;

  return (
    <DashboardLayout
      title="Partner Settlements"
      profile={{ role: "partner", name: user?.displayName || "Partner" }}
    >
      <div className="bg-white p-6 rounded-2xl shadow mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Your Settlement History</h1>
        <p className="text-gray-600">
          View all your settlement requests, approval status, and invoices.
        </p>
      </div>

      {/* Settlements Table */}
      <div className="overflow-x-auto rounded-2xl bg-white shadow">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Amount (₹)</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Invoice</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {settlements.length > 0 ? (
              settlements.map((s) => (
                <tr key={s.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-700">{s.id.slice(0, 8)}</td>
                  <td className="px-4 py-2 font-medium">{s.amount?.toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        s.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : s.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : s.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {s.invoiceUrl ? (
                      <a
                        href={s.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View PDF
                      </a>
                    ) : (
                      <span className="text-gray-400">--</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {s.createdAt?.toDate
                      ? s.createdAt.toDate().toLocaleDateString()
                      : "--"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {!s.hasDispute && (
                      <button
                        onClick={() => setDisputeModal({ open: true, id: s.id })}
                        className="px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 text-xs"
                      >
                        Raise Dispute
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-500">
                  No settlements found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Dispute Modal */}
      {disputeModal.open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-3">Raise a Dispute</h2>
            <p className="text-sm text-gray-600 mb-4">
              You’re submitting a dispute for settlement ID:{" "}
              <span className="font-medium">{disputeModal.id}</span>
            </p>

            <label className="block mb-2 text-sm font-medium">Reason</label>
            <input
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              className="border rounded-lg w-full p-2 mb-3"
              placeholder="E.g., incorrect payout amount"
            />

            <label className="block mb-2 text-sm font-medium">Description (optional)</label>
            <textarea
              value={disputeDesc}
              onChange={(e) => setDisputeDesc(e.target.value)}
              className="border rounded-lg w-full p-2 mb-3"
              rows={3}
              placeholder="Provide additional context..."
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDisputeModal({ open: false })}
                className="px-3 py-1 bg-gray-100 rounded-md hover:bg-gray-200 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submitDispute}
                className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
              >
                Submit Dispute
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
