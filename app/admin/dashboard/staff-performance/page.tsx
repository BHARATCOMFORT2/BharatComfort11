"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import { useAuth } from "@/hooks/useAuth";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type NoteItem = {
  leadId: string;
  note: string;
  status: string;
  date: any;
};

type StaffPerformance = {
  staffId: string;
  name: string | null;
  email: string | null;
  totalLeads: number;
  contacted: number;
  interested: number;
  followups: number;
  converted: number;
  lastNote?: string;
  notes?: NoteItem[]; // ✅ Date-wise notes for expandable view
};

export default function AdminStaffPerformancePage() {
  const { firebaseUser, profile, loading } = useAuth();
  const router = useRouter();

  const [token, setToken] = useState("");
  const [days, setDays] = useState(30);
  const [data, setData] = useState<StaffPerformance[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [openStaff, setOpenStaff] = useState<string | null>(null);

  /* ✅ ADMIN PROTECTION */
  useEffect(() => {
    if (loading) return;

    if (!firebaseUser || !["admin", "superadmin"].includes(profile?.role || "")) {
      router.push("/");
      return;
    }

    firebaseUser.getIdToken().then((t) => setToken(t));
  }, [firebaseUser, profile, loading, router]);

  /* ✅ LOAD PERFORMANCE DATA */
  useEffect(() => {
    if (!token) return;

    setPageLoading(true);

    fetch(`/api/admin/staff/performance?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data || []);
      })
      .finally(() => setPageLoading(false));
  }, [token, days]);

  if (pageLoading) return <p className="p-6">Loading performance...</p>;

  /* ✅ CHART DATA (TOTAL VS CONVERTED) */
  const chartData = data.map((s) => ({
    name: s.name || "Unknown",
    total: s.totalLeads,
    converted: s.converted,
  }));

  return (
    <AdminDashboardLayout title="Staff Performance" profile={profile}>
      {/* ✅ FILTER */}
      <div className="mb-6 flex gap-4 items-center">
        <label className="text-sm font-medium">Time Range:</label>
        <select
          className="border px-3 py-1 rounded text-sm"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 90 Days</option>
          <option value={180}>Last 6 Months</option>
        </select>
      </div>

      {/* ✅ PERFORMANCE CHART */}
      <section className="bg-white shadow rounded-lg p-6 mb-10">
        <h3 className="font-semibold mb-4">
          Lead vs Conversion Performance
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="total" />
            <Line type="monotone" dataKey="converted" />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* ✅ PERFORMANCE TABLE + NOTES */}
      <section className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-center">Total</th>
              <th className="p-3 text-center">Contacted</th>
              <th className="p-3 text-center">Interested</th>
              <th className="p-3 text-center">Follow-ups</th>
              <th className="p-3 text-center">Converted</th>
              <th className="p-3 text-center">Conv %</th>
              <th className="p-3 text-left">Latest Note</th>
              <th className="p-3 text-center">Details</th>
            </tr>
          </thead>
          <tbody>
            {data.map((s) => {
              const rate =
                s.totalLeads > 0
                  ? Math.round((s.converted / s.totalLeads) * 100)
                  : 0;

              return (
                <>
                  {/* ✅ MAIN ROW */}
                  <tr key={s.staffId} className="border-t">
                    <td className="p-3">{s.name || "Unknown"}</td>
                    <td className="p-3">{s.email || "-"}</td>
                    <td className="p-3 text-center">{s.totalLeads}</td>
                    <td className="p-3 text-center">{s.contacted}</td>
                    <td className="p-3 text-center">{s.interested}</td>
                    <td className="p-3 text-center">{s.followups}</td>
                    <td className="p-3 text-center font-semibold">
                      {s.converted}
                    </td>
                    <td className="p-3 text-center font-semibold">
                      {rate}%
                    </td>
                    <td className="p-3 text-xs text-gray-700">
                      {s.lastNote || "—"}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() =>
                          setOpenStaff(
                            openStaff === s.staffId ? null : s.staffId
                          )
                        }
                        className="px-3 py-1 text-xs rounded bg-black text-white"
                      >
                        {openStaff === s.staffId ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>

                  {/* ✅ EXPANDED NOTES */}
                  {openStaff === s.staffId && (
                    <tr className="bg-gray-50">
                      <td colSpan={10} className="p-4">
                        <div className="font-medium mb-2">
                          Date-wise Notes
                        </div>

                        {!s.notes || s.notes.length === 0 ? (
                          <p className="text-xs text-gray-500">
                            No notes available
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {s.notes.map((n, i) => (
                              <div
                                key={i}
                                className="border rounded p-2 text-xs bg-white"
                              >
                                <div className="flex justify-between">
                                  <span className="font-medium capitalize">
                                    {n.status}
                                  </span>
                                  <span className="text-gray-500">
                                    {n.date?.seconds
                                      ? new Date(
                                          n.date.seconds * 1000
                                        ).toLocaleDateString()
                                      : "-"}
                                  </span>
                                </div>
                                <div className="mt-1 text-gray-700">
                                  {n.note}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>

        {!data.length && (
          <p className="p-6 text-center text-gray-500">
            No performance data found for this period
          </p>
        )}
      </section>
    </AdminDashboardLayout>
  );
}
