"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import toast from "react-hot-toast";

export default function AdminKYCPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [remark, setRemark] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  /* ✅ LOAD KYC LIST FROM ADMIN API ONLY */
  async function loadKYC() {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/partners/kyc/list?status=UNDER_REVIEW", {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to load KYCs");
      }

      setList(data.data || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load KYC list");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKYC();
  }, []);

  /* ✅ FINAL APPROVE / REJECT — ONLY VIA ADMIN API */
  async function handleDecision(type: "approve" | "reject") {
    if (!selected) return;

    if (type === "reject" && !remark.trim()) {
      return toast.error("Rejection reason is required");
    }

    setActionLoading(true);

    try {
      const res = await fetch("/api/admin/partners/kyc", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          partnerUid: selected.partnerId || selected.uid,
          kycId: selected.kycId || selected.kyc?.id || null,
          action: type,
          reason: remark || "",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "KYC update failed");
      }

      toast.success(
        type === "approve"
          ? "✅ Partner KYC Approved"
          : "❌ Partner KYC Rejected"
      );

      setSelected(null);
      setRemark("");
      loadKYC();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <DashboardLayout title="KYC Review" profile={{ role: "admin", name: "Admin" }}>
      <div className="bg-white rounded-xl p-6 shadow">
        <h2 className="text-xl font-semibold mb-4">Pending KYCs</h2>

        {loading ? (
          <p>Loading...</p>
        ) : list.length === 0 ? (
          <p className="text-gray-500">No pending KYC found</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {list.map((p) => (
              <div
                key={p.partnerId || p.uid}
                onClick={() => setSelected(p)}
                className="border rounded-lg p-4 hover:shadow cursor-pointer"
              >
                <h3 className="font-semibold">
                  {p.partner?.businessName || p.partner?.name}
                </h3>
                <p className="text-sm text-gray-500">{p.partner?.email}</p>
                <span className="inline-block mt-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  UNDER REVIEW
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ✅ MODAL */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[95%] max-w-lg shadow-xl relative">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3"
            >
              ✕
            </button>

            <h3 className="text-lg font-semibold mb-1">
              {selected.partner?.businessName || selected.partner?.name}
            </h3>

            <p className="text-sm text-gray-600 mb-3">
              {selected.partner?.email} | {selected.partner?.phone}
            </p>

            <label className="block text-sm mb-1">Admin Remark</label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full border rounded p-2 mb-4"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleDecision("reject")}
                disabled={actionLoading}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Reject
              </button>
              <button
                onClick={() => handleDecision("approve")}
                disabled={actionLoading}
                className="bg-green-600 text-white px-4 py-2 rounded"
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
