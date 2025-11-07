"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function AdminKYCReviewPage() {
  const router = useRouter();
  const [pendingKYCs, setPendingKYCs] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [remark, setRemark] = useState("");

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) return router.push("/auth/login");
      const t = await user.getIdToken();
      setToken(t);

      // Load all partners with pending KYC
      const q = query(collection(db, "partners"), where("kyc.status", "==", "pending"));
      const unsubSnap = onSnapshot(q, (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPendingKYCs(data);
        setLoading(false);
      });

      return () => unsubSnap();
    });
    return () => unsub();
  }, [router]);

  const handleReview = async (action: "approve" | "reject") => {
    if (!selected || !token) return;
    try {
      const res = await fetch("/api/admin/kyc/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId: selected.id,
          action,
          remark,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ KYC ${action === "approve" ? "Approved" : "Rejected"}!`);
        setSelected(null);
        setRemark("");
      } else alert(`❌ ${data.error}`);
    } catch (err) {
      console.error("Review error:", err);
    }
  };

  if (loading) return <p className="text-center py-10">Loading pending KYCs...</p>;

  return (
    <DashboardLayout title="KYC Review" profile={{ role: "admin", name: "Admin" }}>
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-4">Pending KYC Verifications</h2>

        {pendingKYCs.length === 0 ? (
          <p className="text-gray-500">No pending KYCs found 🎉</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {pendingKYCs.map((p) => (
              <div
                key={p.id}
                className="border rounded-lg p-4 hover:shadow cursor-pointer"
                onClick={() => setSelected(p)}
              >
                <h3 className="font-semibold">{p.businessName || p.name}</h3>
                <p className="text-sm text-gray-500">{p.email}</p>
                <p className="text-xs mt-1 text-gray-400">
                  Submitted: {p.kyc?.submittedAt?.toDate
                    ? p.kyc.submittedAt.toDate().toLocaleString()
                    : "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Review Modal --- */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[95%] max-w-lg shadow-xl relative">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 text-gray-600 hover:text-black"
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold mb-2">
              Review KYC - {selected.businessName || selected.name}
            </h3>
            <p className="text-gray-600 mb-4 text-sm">{selected.email}</p>

            <div className="space-y-2 mb-4">
              {selected.kyc?.aadhaarUrl && (
                <a
                  href={selected.kyc.aadhaarUrl}
                  target="_blank"
                  className="block text-blue-600 underline"
                >
                  View Aadhaar
                </a>
              )}
              {selected.kyc?.panUrl && (
                <a
                  href={selected.kyc.panUrl}
                  target="_blank"
                  className="block text-blue-600 underline"
                >
                  View PAN
                </a>
              )}
              {selected.kyc?.gstUrl && (
                <a
                  href={selected.kyc.gstUrl}
                  target="_blank"
                  className="block text-blue-600 underline"
                >
                  View GST
                </a>
              )}
            </div>

            <label className="block text-sm font-medium mb-1">Admin Remark</label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full border rounded-lg p-2 mb-4"
              placeholder="Add a note (optional)"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleReview("reject")}
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
              >
                Reject
              </button>
              <button
                onClick={() => handleReview("approve")}
                className="px-4 py-2 bg-green-600 text-white rounded-lg"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
