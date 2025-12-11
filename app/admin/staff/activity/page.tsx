"use client";
export const dynamic = "force-dynamic";   // ✅ FIX 1 (no prerender)
export const runtime = "nodejs";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

/* TYPES */
type Activity = {
  id: string;
  type: string;
  text?: string;
  note?: string;
  outcome?: string;
  phone?: string;
  oldStatus?: string;
  newStatus?: string;
  leadId: string;
  createdAt: string;
};

export default function AdminStaffActivityPage() {
  const { firebaseUser } = useAuth();
  const search = useSearchParams();
  const router = useRouter();

  const staffId = search.get("staffId") || "";
  const [staffName, setStaffName] = useState<string>("");

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  /* FILTER STATES */
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [days, setDays] = useState(30);

  /* BACKEND FETCH */
  const fetchActivity = async () => {
    if (!firebaseUser || !staffId) return;
    try {
      setLoading(true);

      const token = await firebaseUser.getIdToken();

      const res = await fetch("/api/admin/staff/activity", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staffId,
          days,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setActivities(json.activities || []);
      setStaffName(json.staff?.name || "");
    } catch (err: any) {
      toast.error(err.message || "Failed to load activity");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, [firebaseUser, staffId, days]);

  /* CLIENT FILTERING */
  const filtered = activities.filter((log) => {
    if (typeFilter !== "all" && log.type !== typeFilter) return false;

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      if (
        !(log.text?.toLowerCase().includes(q) ||
          log.note?.toLowerCase().includes(q) ||
          log.leadId.toLowerCase().includes(q) ||
          log.outcome?.toLowerCase().includes(q))
      )
        return false;
    }

    return true;
  });

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Telecaller Activity Timeline</h1>
          <p className="text-sm text-gray-500">
            Complete activity history of: <b>{staffName}</b>
          </p>
        </div>

        <button onClick={() => router.back()} className="text-sm text-blue-600 hover:underline">
          ← Back
        </button>
      </div>

      {/* FILTERS */}
      <div className="bg-white shadow rounded-lg p-4 grid sm:grid-cols-4 gap-4">
        <div>
          <label className="text-xs">Search</label>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Lead ID, note, call outcome..."
            className="border px-3 py-2 text-sm w-full rounded"
          />
        </div>

        <div>
          {/* ❌ label classname → ✔ className  (FIX 2) */}
          <label className="text-xs">Activity Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border px-3 py-2 text-sm w-full rounded"
          >
            <option value="all">All</option>
            <option value="note">Notes</option>
            <option value="call">Call Logs</option>
            <option value="status">Status Updates</option>
            <option value="assign">Assignment</option>
          </select>
        </div>

        <div>
          <label className="text-xs">Days</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border px-3 py-2 text-sm w-full rounded"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Details</th>
              <th className="px-4 py-2 text-left">Lead</th>
              <th className="px-4 py-2 text-left">Time</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center p-6 text-gray-500">
                  Loading timeline…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center p-6 text-gray-500">
                  No activity found.
                </td>
              </tr>
            ) : (
              filtered.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 capitalize">{log.type}</td>

                  <td className="px-4 py-3 text-gray-700">
                    {log.type === "call" && (
                      <div>
                        <p>
                          <b>Outcome:</b> {log.outcome || "—"}
                        </p>
                        <p>{log.note}</p>
                      </div>
                    )}

                    {log.type === "note" && <p>{log.text}</p>}

                    {log.type === "status" && (
                      <p>
                        Status changed: <b>{log.oldStatus}</b> →{" "}
                        <b>{log.newStatus}</b>
                      </p>
                    )}

                    {log.type === "assign" && <p>Lead assigned</p>}
                  </td>

                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                      {log.leadId}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
