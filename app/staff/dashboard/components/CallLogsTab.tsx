"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type CallLog = {
  id: string;
  leadName: string;
  leadPhone: string;
  outcome?: string;
  note?: string;
  createdAt?: any;
};

type Props = {
  token: string;
};

export default function CallLogsTab({ token }: Props) {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---------------------------------------
     FETCH CALL LOGS (STAFF ONLY)
  ---------------------------------------- */
  useEffect(() => {
    if (!token) return;

    const loadLogs = async () => {
      try {
        setLoading(true);

        const res = await fetch("/api/staff/calls", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error();

        setLogs(data.logs || []);
      } catch {
        toast.error("Call logs load nahi ho paaye");
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [token]);

  /* ---------------------------------------
     HELPERS
  ---------------------------------------- */
  const formatDate = (ts: any) => {
    if (!ts) return "-";
    const d =
      typeof ts === "string"
        ? new Date(ts)
        : ts.toDate
        ? ts.toDate()
        : new Date(ts);
    return d.toLocaleString("en-IN");
  };

  const todayCount = logs.filter((l) => {
    if (!l.createdAt) return false;
    const d = l.createdAt.toDate
      ? l.createdAt.toDate()
      : new Date(l.createdAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  /* ---------------------------------------
     UI
  ---------------------------------------- */
  return (
    <div className="bg-white rounded shadow p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold">📞 Call Logs</h2>
        <div className="text-xs text-gray-600">
          Today: <b>{todayCount}</b> | Total: <b>{logs.length}</b>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading call logs…</div>
      ) : logs.length === 0 ? (
        <div className="text-sm text-gray-500">No call logs found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Time</th>
                <th className="p-2 text-left">Lead</th>
                <th className="p-2 text-left">Phone</th>
                <th className="p-2 text-left">Outcome</th>
                <th className="p-2 text-left">Note</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="p-2">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="p-2">{log.leadName || "-"}</td>
                  <td className="p-2">{log.leadPhone || "-"}</td>
                  <td className="p-2">{log.outcome || "dialed"}</td>
                  <td className="p-2 max-w-xs truncate">
                    {log.note || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
