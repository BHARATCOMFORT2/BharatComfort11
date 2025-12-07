"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import toast from "react-hot-toast";

type Partner = {
  partnerId: string;
  partner?: {
    name?: string;
    businessName?: string;
    email?: string;
  };
  status?: string;
};

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /* ✅ LOAD PARTNERS FROM ADMIN API */
  async function loadPartners() {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/partners/list", {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to load partners");
      }

      setPartners(data.data || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load partners");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPartners();
  }, []);

  /* ✅ APPROVE / REJECT VIA ADMIN API ONLY */
  async function handleApproval(
    partnerId: string,
    action: "approve" | "reject"
  ) {
    if (!confirm(`Are you sure you want to ${action} this partner?`)) return;

    try {
      setActionLoading(partnerId);

      const res = await fetch("/api/admin/partners/kyc", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          partnerUid: partnerId,
          action,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Action failed");
      }

      toast.success(`Partner ${action}d successfully`);
      loadPartners();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <DashboardLayout title="Admin • Manage Partners">
      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            Partner Accounts
          </h2>
          <span className="text-sm text-gray-500">
            Total: {partners.length}
          </span>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-12">
            Loading partners…
          </p>
        ) : partners.length === 0 ? (
          <p className="text-center text-gray-500 py-12">
            No partners found.
          </p>
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
                  <tr key={p.partnerId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {p.partner?.name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {p.partner?.businessName || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.partner?.email || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        {p.status || "PENDING"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {p.status === "PENDING_KYC" && (
                        <>
                          <button
                            onClick={() =>
                              handleApproval(p.partnerId, "approve")
                            }
                            disabled={actionLoading === p.partnerId}
                            className="rounded-lg bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              handleApproval(p.partnerId, "reject")
                            }
                            disabled={actionLoading === p.partnerId}
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
