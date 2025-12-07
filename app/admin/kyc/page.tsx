"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import toast from "react-hot-toast";

export default function AdminKYCReviewPage() {
  const router = useRouter();

  const [pending, setPending] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [remark, setRemark] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  /* ✅ LOAD PENDING KYC — FROM CORRECT ADMIN API */
  async function loadPending() {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/partners/kyc/list?status=UNDER_REVIEW", {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to load pending KYCs");
      }

      setPending(data.data || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load KYC list");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPending();
  }, []);

  /* ✅ ✅ ✅ FINAL FIX — APPROVE / REJECT USING SINGLE CORRECT API */
  async function handleDecision(type: "approve" | "reject") {
    if (!selected) return;

    if (type === "reject" && !remark.trim()) {
      return toast.error("Rejection reason is required");
    }

    setActionLoading(true);

    try {
      const res = await fetch("/api/admin/partners/kyc", {
        method: "POST",
        credentials: "include", // ✅ COOKIE-BASED ADMIN AUTH
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
      loadPending();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <DashboardLayout title="KYC Review" profile={{ role: "admin", name: "Admin" }}>
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-4">Pending KYC Verifications</h2>

        {loading ? (
          <p className="text-center py-10">Loading pending KYCs…</p>
        ) : pending.length === 0 ? (
          <p className="text-gray-500">🎉 No pending KYCs found</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {pending.map((p) => (
              <div
                key={p.partnerId || p.uid}
                className="border rounded-lg p-4 hover:shadow cursor-pointer"
                onClick={() => setSelected(p)}
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

      {/* ✅ REVIEW MODAL */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[95%] max-w-lg shadow-xl relative">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 text-gray-600 hover:text-black"
            >
              ✕
            </button>

            <h3 className="text-lg font-semibold mb-1">
              {selected.partner?.businessName ||
                selected.partner?.name ||
                "Partner"}
            </h3>

            <p className="text-gray-600 mb-4 text-sm">
              {selected.partner?.email} | {selected.partner?.phone}
            </p>

            <div className="space-y-2 mb-5 text-sm">
              <p>
                <b>Aadhaar:</b> {selected.kyc?.aadhaarLast4 || "—"}
              </p>
              <p>
                <b>GST:</b> {selected.kyc?.gstNumber || "—"}
              </p>

              {Array.isArray(selected.kyc?.documents) &&
                selected.kyc.documents.map((doc: any, i: number) => (
                  <a
                    key={i}
                    href={`/api/files/view?path=${encodeURIComponent(
                      doc.storagePath
                    )}`}
                    target="_blank"
                    className="block text-blue-600 underline"
                  >
                    View {doc.docType}
                  </a>
                ))}
            </div>

            <label className="block text-sm font-medium mb-1">
              Admin Remark (required for rejection)
            </label>

            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full border rounded-lg p-2 mb-4"
              placeholder="Enter rejection reason"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleDecision("reject")}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
              >
                {actionLoading ? "Processing..." : "Reject"}
              </button>

              <button
                onClick={() => handleDecision("approve")}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg"
              >
                {actionLoading ? "Processing..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
