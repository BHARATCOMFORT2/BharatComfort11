"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

/* ==========================================================
   🔐 Admin – KYC Management Dashboard
   Lists all partners who have submitted KYC documents.
   Allows admin to Approve or Reject.
========================================================== */
export default function AdminKycPage() {
  const [kycList, setKycList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    // Listen to all partners that have a KYC field
    const q = query(collection(db, "partners"), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((p) => p.kyc && p.kyc.documents);
        setKycList(data);
        setLoading(false);
      },
      (err) => {
        console.error("KYC fetch error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    try {
      setUpdating(id);
      const res = await fetch("/api/admin/kyc-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId: id, status }),
      });
      const data = await res.json();
      alert(data.success ? `✅ KYC ${status}` : `❌ ${data.error}`);
    } catch (err) {
      console.error("KYC update failed:", err);
      alert("Failed to update KYC");
    } finally {
      setUpdating(null);
    }
  };

  if (loading)
    return <p className="p-6 text-gray-600 text-center">Loading KYC submissions…</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">KYC Submissions</h1>

      {kycList.length === 0 && (
        <p className="text-gray-500">No partner KYC submissions found.</p>
      )}

      <div className="space-y-6">
        {kycList.map((partner) => (
          <div
            key={partner.id}
            className="bg-white rounded-xl shadow p-6 border border-gray-100"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
              <div>
                <h3 className="font-semibold text-lg">
                  {partner.businessName || partner.email}
                </h3>
                <p className="text-gray-600 text-sm">
                  Status:{" "}
                  <b
                    className={`${
                      partner.kyc?.status === "approved"
                        ? "text-green-600"
                        : partner.kyc?.status === "rejected"
                        ? "text-red-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {partner.kyc?.status || "submitted"}
                  </b>
                </p>
              </div>

              <div className="mt-3 sm:mt-0 flex gap-2">
                <button
                  onClick={() => updateStatus(partner.id, "approved")}
                  disabled={updating === partner.id}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => updateStatus(partner.id, "rejected")}
                  disabled={updating === partner.id}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>

            {partner.kyc?.documents && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                {Object.entries(partner.kyc.documents).map(([label, url]) => (
                  <a
                    key={label}
                    href={url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 text-sm underline truncate"
                  >
                    {label}.pdf / image
                  </a>
                ))}
              </div>
            )}

            {partner.kyc?.submittedAt && (
              <p className="text-xs text-gray-500 mt-2">
                Submitted:{" "}
                {partner.kyc.submittedAt?.toDate
                  ? partner.kyc.submittedAt.toDate().toLocaleString()
                  : new Date(partner.kyc.submittedAt).toLocaleString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
