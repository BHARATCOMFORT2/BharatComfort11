"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  AlertTriangle,
  RefreshCcw,
  Filter,
  Activity,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

/* =========================================================
   🔹 TYPES
========================================================= */
type Anomaly = {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  partnerId?: string;
  createdAt?: any;
  meta?: Record<string, any>;
};

type Summary = Record<string, number>;

/* =========================================================
   🔹 Main Component
========================================================= */
export default function FinanceAnomaliesPage() {
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [summary, setSummary] = useState<Summary>({});
  const [filter, setFilter] = useState<"all" | "high" | "critical" | "medium" | "low">(
    "all"
  );

  /* =========================================================
     🔹 Load anomalies
  ========================================================= */
  const loadAnomalies = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/finance-audit");
      const json = await res.json();
      if (json.success) setAnomalies(json.anomalies || []);
    } catch (err) {
      console.error("Failed to load anomalies:", err);
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     🔹 Run audit
  ========================================================= */
  const runAudit = async () => {
    if (!firebaseUser) return;
    setRunning(true);
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch("/api/admin/finance-audit", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        await loadAnomalies();
        setSummary(json.summary);
        alert(`Audit completed — ${json.saved} anomalies detected.`);
      } else alert(json.error || "Audit failed.");
    } catch (err) {
      console.error("Audit run error:", err);
      alert("Error running audit. Check console.");
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    loadAnomalies();
  }, []);

  /* =========================================================
     🔹 Filtered view
  ========================================================= */
  const filtered =
    filter === "all" ? anomalies : anomalies.filter((a) => a.severity === filter);

  const colorForSeverity = (sev: string) =>
    sev === "critical"
      ? "bg-red-600"
      : sev === "high"
      ? "bg-orange-500"
      : sev === "medium"
      ? "bg-yellow-400"
      : "bg-gray-400";

  /* =========================================================
     🔹 JSX
  ========================================================= */
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-3 items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="text-blue-600" /> Finance Anomalies
        </h1>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={loadAnomalies} disabled={loading}>
            <RefreshCcw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button onClick={runAudit} disabled={running}>
            {running ? (
              <>
                <Activity className="animate-spin mr-2" /> Running…
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2" /> Run Audit
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "critical", "high", "medium", "low"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full border ${
              filter === s ? "bg-blue-600 text-white" : "bg-white text-gray-700"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      {!!Object.keys(summary).length && (
        <div className="grid md:grid-cols-3 gap-4">
          {Object.entries(summary).map(([type, count]) => (
            <Card key={type} className="border-l-4 border-blue-500">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-600">{type}</h3>
                <div className="text-2xl font-bold">{count}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Anomaly list */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Severity</th>
              <th className="text-left p-3">Message</th>
              <th className="text-left p-3">Partner</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={5}>
                  No anomalies found.
                </td>
              </tr>
            )}
            {filtered.map((a) => (
              <tr key={a.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{a.type}</td>
                <td className="p-3">
                  <span
                    className={`text-xs text-white px-2 py-1 rounded ${colorForSeverity(
                      a.severity
                    )}`}
                  >
                    {a.severity}
                  </span>
                </td>
                <td className="p-3">{a.message}</td>
                <td className="p-3">
                  {a.partnerId ? (
                    <Link
                      href={`/admin/dashboard/partners/${a.partnerId}`}
                      className="text-blue-600 hover:underline"
                    >
                      {a.partnerId}
                    </Link>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-3 text-gray-500 text-xs">
                  {a.createdAt?.seconds
                    ? new Date(a.createdAt.seconds * 1000).toLocaleString("en-IN")
                    : "--"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="text-xs text-gray-500 flex items-center gap-2 mt-4">
        <Filter className="w-3 h-3" /> Showing {filtered.length} of {anomalies.length} anomalies
      </div>

      {/* Footer tip */}
      <p className="text-xs text-muted-foreground mt-4">
        <CheckCircle2 className="inline w-4 h-4 text-green-600 mr-1" />
        Finance audit runs automatically on schedule or manually here. 
        Severe anomalies trigger Slack & email alerts.
      </p>
    </div>
  );
}
