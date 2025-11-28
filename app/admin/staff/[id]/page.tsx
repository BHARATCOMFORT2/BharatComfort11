"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import toast from "react-hot-toast";

type Lead = {
  id: string;
  name?: string;
  businessName?: string;
  address?: string;
  contact?: string;
  email?: string;
  status?: string;
  partnerNotes?: string;
};

type StaffProfile = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: "pending" | "approved" | "rejected";
  createdAt?: any;
};

export default function AdminStaffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params?.id as string;

  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    if (!staffId) return;

    const fetchStaffDetail = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/staff/get?staffId=${staffId}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data?.message || "Failed to load staff details");
        }

        setStaff(data.staff);
        setLeads(data.leads || []);
      } catch (err: any) {
        console.error("Staff detail error:", err);
        toast.error(err?.message || "Staff detail load nahi ho paaya");
      } finally {
        setLoading(false);
      }
    };

    fetchStaffDetail();
  }, [staffId]);

  return (
    <DashboardLayout title="Staff Details">
      <div className="space-y-6">
        {/* ✅ Back Button */}
        <button
          onClick={() => router.back()}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Staff List
        </button>

        {/* ✅ Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h1 className="text-xl font-semibold mb-2">
            {staff?.name || "Staff Member"}
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Email:</span>{" "}
              {staff?.email || "-"}
            </div>
            <div>
              <span className="text-gray-500">Phone:</span>{" "}
              {staff?.phone || "-"}
            </div>
            <div>
              <span className="text-gray-500">Status:</span>{" "}
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  staff?.status === "approved"
                    ? "bg-green-100 text-green-700"
                    : staff?.status === "rejected"
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {staff?.status || "pending"}
              </span>
            </div>
          </div>
        </div>

        {/* ✅ Assigned Leads */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-medium">Assigned Leads</h2>
            {loading && (
              <span className="text-xs text-gray-400">Loading...</span>
            )}
          </div>

          {leads.length === 0 && !loading ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Is staff ko abhi tak koi lead assign nahi hui hai.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      Business
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      Contact
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      Partner Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="align-top">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {lead.name || "-"}
                        {lead.email && (
                          <div className="text-xs text-gray-500">
                            {lead.email}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {lead.businessName || "-"}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {lead.contact || "-"}
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          {lead.status || "new"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-600 whitespace-pre-wrap">
                          {lead.partnerNotes || "-"}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
