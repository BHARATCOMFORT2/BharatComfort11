"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Lead = {
  id: string;
  name: string;
  businessName?: string;
  contact?: string;
  status?: string;
};

type StaffProfile = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
};

export default function AdminStaffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params.staffId as string;

  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // ✅ Staff Profile
      const staffRes = await fetch(`/api/admin/staff/${staffId}`);
      const staffJson = await staffRes.json();

      if (!staffRes.ok || !staffJson.success) {
        throw new Error(staffJson?.message || "Staff load failed");
      }

      setStaff(staffJson.data);

      // ✅ Assigned Leads
      const leadRes = await fetch(`/api/admin/staff/${staffId}/leads`);
      const leadJson = await leadRes.json();

      if (!leadRes.ok || !leadJson.success) {
        throw new Error(leadJson?.message || "Leads load failed");
      }

      setLeads(leadJson.data || []);
    } catch (err: any) {
      console.error("Staff detail error:", err);
      toast.error(err?.message || "Staff detail load fail");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staffId) fetchData();
  }, [staffId]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Staff Detail</h1>
          <p className="text-sm text-gray-500">
            Telecaller ka profile aur assigned leads
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="px-3 py-1.5 text-xs rounded-md border"
        >
          ← Back
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading staff details...</div>
      ) : !staff ? (
        <div className="text-sm text-red-500">Staff not found</div>
      ) : (
        <>
          {/* ✅ Staff Profile Card */}
          <div className="bg-white border rounded-xl p-5">
            <h2 className="text-sm font-medium mb-3">Staff Profile</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Name</p>
                <p className="font-medium">{staff.name || "-"}</p>
              </div>
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium">{staff.email || "-"}</p>
              </div>
              <div>
                <p className="text-gray-500">Phone</p>
                <p className="font-medium">{staff.phone || "-"}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                    staff.status === "approved"
                      ? "bg-emerald-100 text-emerald-700"
                      : staff.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {staff.status}
                </span>
              </div>
              <div>
                <p className="text-gray-500">Total Assigned Leads</p>
                <p className="font-medium">{leads.length}</p>
              </div>
            </div>
          </div>

          {/* ✅ Assigned Leads Table */}
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="text-sm font-medium">Assigned Leads</h2>
              <span className="text-xs text-gray-500">
                {leads.length} total
              </span>
            </div>

            {leads.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                Is staff ko abhi koi lead assign nahi hui hai.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Business</th>
                      <th className="px-4 py-2 text-left">Contact</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {leads.map((lead) => (
                      <tr key={lead.id}>
                        <td className="px-4 py-2">{lead.name || "-"}</td>
                        <td className="px-4 py-2">
                          {lead.businessName || "-"}
                        </td>
                        <td className="px-4 py-2">{lead.contact || "-"}</td>
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                            {lead.status || "not-set"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
