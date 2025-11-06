"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";

interface LogEntry {
  id: string;
  type: string;
  uid?: string;
  amount?: number;
  reason?: string;
  adjustmentType?: string;
  message?: string;
  createdAt?: any;
}

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [since, setSince] = useState("");
  const [limit, setLimit] = useState(50);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set("type", filterType);
      if (since) params.set("since", since);
      if (limit) params.set("limit", limit.toString());

      const res = await fetch(`/api/admin/system/logs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      } else {
        console.error("Failed to load logs:", data.error);
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">🧾 System Logs</h1>
        <div className="flex gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border rounded-lg px-3 py-2 bg-white"
          >
            <option value="">All Types</option>
            <option value="manual_wallet_adjustment">Wallet Adjustments</option>
            <option value="partner_approval">Partner Approvals</option>
            <option value="settlement_action">Settlements</option>
            <option value="referral_reward">Referral Rewards</option>
          </select>

          <input
            type="date"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            className="border rounded-lg px-3 py-2 bg-white"
          />

          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="border rounded-lg px-3 py-2 bg-white"
          >
            <option value="25">Last 25</option>
            <option value="50">Last 50</option>
            <option value="100">Last 100</option>
          </select>

          <Button onClick={fetchLogs} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-100">
            <tr className="text-left text-sm font-semibold text-gray-600">
              <th className="p-3">Type</th>
              <th className="p-3">User / Partner</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Reason</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.id} className="border-t text-sm hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-700">{log.type}</td>
                  <td className="p-3">{log.uid || "—"}</td>
                  <td className="p-3 text-gray-700">
                    {log.amount ? `₹${log.amount}` : "—"}
                  </td>
                  <td className="p-3">{log.reason || log.message || "—"}</td>
                  <td className="p-3 text-gray-500">
                    {log.createdAt?._seconds
                      ? new Date(log.createdAt._seconds * 1000).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="text-center text-gray-500 py-6 text-sm"
                >
                  {loading ? "Loading logs..." : "No logs found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
