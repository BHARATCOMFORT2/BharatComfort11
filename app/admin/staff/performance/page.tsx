"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type StaffPerformance = {
  staffId: string;
  name?: string;
  email?: string;
  totalLeads: number;
  contacted: number;
  interested: number;
  followups: number;
  converted: number;
};

export default function AdminStaffPerformancePage() {
  const [data, setData] = useState<StaffPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/staff/performance?days=${days}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json?.message || "Performance load failed");
      }

      setData(json.data || []);
    } catch (err: any) {
      console.error("Performance fetch error:", err);
      toast.error(err?.message || "Performance data load nahi hua");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, [days]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Telecaller Performance</h1>
          <p className="text-sm text-gray-500">
            Sab staff ka leads & conversion performance
          </p>
        </div>

        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="border rounded-md px-2 py-1 text-sm"
        >
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 90 Days</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-medium">Staff Performance Summary</h2>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading report...</div>
        ) : data.length === 0 ? (
          <div className="p-6 text-sm text-gray-500 text-center">
            Abhi koi performance data available nahi hai.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-center">Total Leads</th>
                  <th className="px-4 py-2 text-center">Contacted</th>
                  <th className="px-4 py-2 text-center">Interested</th>
                  <th className="px-4 py-2 text-center">Follow-ups</th>
                  <th className="px-4 py-2 text-center">Converted</th>
                  <th className="px-4 py-2 text-center">Conversion %</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((s) => {
                  const conversion =
                    s.totalLeads > 0
                      ? Math.round((s.converted / s.totalLeads) * 100)
                      : 0;

                  return (
                    <tr key={s.staffId}>
                      <td className="px-4 py-2">{s.name || "-"}</td>
                      <td className="px-4 py-2">{s.email || "-"}</td>
                      <td className="px-4 py-2 text-center">{s.totalLeads}</td>
                      <td className="px-4 py-2 text-center">{s.contacted}</td>
                      <td className="px-4 py-2 text-center">{s.interested}</td>
                      <td className="px-4 py-2 text-center">{s.followups}</td>
                      <td className="px-4 py-2 text-center">{s.converted}</td>
                      <td className="px-4 py-2 text-center font-medium">
                        {conversion}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
