"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

type StaffPerformance = {
  staffId: string;
  name?: string;
  email?: string;
  totalLeads: number;
  contacted: number;
  interested: number;
  followups: number;
  converted: number;
  totalNotes: number;
  totalCalls: number;
  latestActivityAt?: string | null;
};

type Telecaller = {
  id: string;
  name: string;
};

export default function AdminStaffPerformancePage() {
  const { firebaseUser } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<StaffPerformance[]>([]);
  const [staffList, setStaffList] = useState<Telecaller[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  /* --------------------------------------------------------
     LOAD TELECALLER LIST
  -------------------------------------------------------- */
  const fetchTelecallers = async (token: string) => {
    try {
      const res = await fetch("/api/admin/staff/telecallers", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (json.success) setStaffList(json.data || []);
    } catch {
      toast.error("Telecaller list load nahi hui");
    }
  };

  /* --------------------------------------------------------
     LOAD PERFORMANCE REPORT
  -------------------------------------------------------- */
  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const token = await firebaseUser?.getIdToken();

      const url = selectedStaff
        ? `/api/admin/staff/performance?staffId=${selectedStaff}&days=${days}`
        : `/api/admin/staff/performance?days=${days}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setData(json.data || []);
    } catch (err: any) {
      toast.error(err.message || "Performance data load nahi hua");
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------------
     INIT LOAD
  -------------------------------------------------------- */
  useEffect(() => {
    if (!firebaseUser) return;

    firebaseUser.getIdToken().then((token) => {
      fetchTelecallers(token);
      fetchPerformance();
    });
  }, [firebaseUser, days, selectedStaff]);

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Telecaller Performance</h1>
          <p className="text-sm text-gray-500">
            Calls, Notes, Leads, Conversion & Activity Summary
          </p>
        </div>

        <div className="flex gap-2 items-center">
          {/* TELECALLER SELECT */}
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="border rounded-md px-2 py-1 text-sm"
          >
            <option value="">All Telecallers</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* DAYS FILTER */}
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
      </div>

      {/* TABLE */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-medium">Performance Summary</h2>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading report...</div>
        ) : data.length === 0 ? (
          <div className="p-6 text-sm text-gray-500 text-center">
            No performance data available.
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

                  <th className="px-4 py-2 text-center">Total Calls</th>
                  <th className="px-4 py-2 text-center">Notes</th>

                  <th className="px-4 py-2 text-center">Conversion %</th>
                  <th className="px-4 py-2 text-left">Latest Activity</th>

                  <th className="px-4 py-2 text-center">Actions</th>
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

                      <td className="px-4 py-2 text-center">{s.totalCalls}</td>
                      <td className="px-4 py-2 text-center">{s.totalNotes}</td>

                      <td className="px-4 py-2 text-center font-medium">
                        {conversion}%
                      </td>

                      <td className="px-4 py-2 text-xs text-gray-700">
                        {s.latestActivityAt
                          ? new Date(s.latestActivityAt).toLocaleString()
                          : "—"}
                      </td>

                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() =>
                            router.push(
                              `/admin/staff/activity?staffId=${s.staffId}`
                            )
                          }
                          className="text-blue-600 hover:underline text-xs"
                        >
                          View Activity →
                        </button>
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
