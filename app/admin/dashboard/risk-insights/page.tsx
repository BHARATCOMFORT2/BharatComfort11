"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  ShieldAlert,
  RefreshCcw,
  BarChart3,
  Search,
  AlertTriangle,
  CheckCircle2,
  User,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

/* ============================================================
   🔹 TYPES
============================================================ */
type RiskTier = "low" | "medium" | "high" | "critical";

interface PartnerRiskScore {
  partnerId: string;
  score: number;
  tier: RiskTier;
  summary: Record<string, number>;
  computedAt?: any;
}

/* ============================================================
   🔹 Utility
============================================================ */
const tierColor = (tier: RiskTier) => {
  switch (tier) {
    case "critical":
      return "bg-red-600 text-white";
    case "high":
      return "bg-orange-500 text-white";
    case "medium":
      return "bg-yellow-400 text-black";
    default:
      return "bg-green-600 text-white";
  }
};

/* ============================================================
   🔹 Component
============================================================ */
export default function RiskInsightsPage() {
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<PartnerRiskScore[]>([]);
  const [filter, setFilter] = useState<RiskTier | "all">("all");
  const [search, setSearch] = useState("");

  /* ------------------------- Load Risk Scores ------------------------- */
  const loadScores = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/risk-scan");
      const json = await res.json();
      if (json.success) setScores(json.scores || []);
    } catch (err) {
      console.error("Failed to load risk data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScores();
  }, []);

  /* ------------------------- Re-run full scan ------------------------- */
  const handleRunFullScan = async () => {
    if (!firebaseUser) return;
    if (!confirm("Run full risk scan for all partners?")) return;

    const token = await firebaseUser.getIdToken();
    const res = await fetch("/api/admin/risk-scan", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (json.success) {
      alert(`✅ Risk scan completed (${json.total} partners, ${json.severe} severe)`);
      loadScores();
    } else alert(json.error || "Scan failed");
  };

  /* ------------------------- Filter Logic ------------------------- */
  const filtered =
    filter === "all"
      ? scores
      : scores.filter((s) => s.tier === filter);

  const searched = filtered.filter((s) =>
    s.partnerId.toLowerCase().includes(search.toLowerCase())
  );

  /* ------------------------- Chart Data ------------------------- */
  const chartData = ["low", "medium", "high", "critical"].map((tier) => ({
    tier,
    count: scores.filter((s) => s.tier === tier).length,
  }));

  /* ------------------------- JSX ------------------------- */
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="text-blue-600" /> Partner Risk Insights
        </h1>

        <div className="flex flex-wrap gap-2">
          <Button onClick={loadScores} className="bg-gray-700 hover:bg-gray-800">
            <RefreshCcw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button onClick={handleRunFullScan} className="bg-red-600 hover:bg-red-700">
            <AlertTriangle className="w-4 h-4 mr-1" /> Run Full Scan
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["all", "low", "medium", "high", "critical"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1 rounded-full border text-sm ${
              filter === t ? "bg-blue-600 text-white" : "bg-white text-gray-700"
            }`}
          >
            {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
          <input
            placeholder="Search by Partner ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg pl-8 pr-3 py-1 text-sm"
          />
        </div>
      </div>

      {/* Summary Chart */}
      <Card className="border-l-4 border-blue-600">
        <CardContent className="p-5">
          <h3 className="font-semibold mb-3 flex items-center">
            <BarChart3 className="mr-2 text-blue-600" /> Risk Tier Distribution
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="tier" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-3">Partner ID</th>
              <th className="text-left p-3">Score</th>
              <th className="text-left p-3">Tier</th>
              <th className="text-left p-3">Refund %</th>
              <th className="text-left p-3">Disputes %</th>
              <th className="text-left p-3">Anomalies</th>
              <th className="text-left p-3">Avg Rating</th>
              <th className="text-left p-3">KYC Age</th>
              <th className="text-left p-3">Last Scan</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {searched.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={10}>
                  No partners found.
                </td>
              </tr>
            )}
            {searched.map((r) => (
              <tr key={r.partnerId} className="border-b hover:bg-gray-50">
                <td className="p-3">{r.partnerId}</td>
                <td className="p-3 font-medium">{r.score}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded ${tierColor(r.tier)}`}>
                    {r.tier.toUpperCase()}
                  </span>
                </td>
                <td className="p-3">{r.summary?.refundRate ?? "--"}%</td>
                <td className="p-3">{r.summary?.disputeRatio ?? "--"}%</td>
                <td className="p-3">{r.summary?.anomalies ?? 0}</td>
                <td className="p-3">{r.summary?.avgRating ?? "--"}</td>
                <td className="p-3">{r.summary?.monthsSinceKyc ?? "--"}</td>
                <td className="p-3 text-gray-500 text-xs">
                  {r.computedAt?.seconds
                    ? new Date(r.computedAt.seconds * 1000).toLocaleString("en-IN")
                    : "--"}
                </td>
                <td className="p-3">
                  <ReScanButton partnerId={r.partnerId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground mt-4 flex items-center gap-2">
        <CheckCircle2 className="text-green-600 w-4 h-4" />
        Risk scoring runs nightly — admin can re-run anytime. 
        Scores below 35 are safe; above 70 require manual review.
      </p>
    </div>
  );
}

/* ============================================================
   🔹 Re-scan button (per partner)
============================================================ */
function ReScanButton({ partnerId }: { partnerId: string }) {
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleReScan = async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch("/api/admin/risk-scan", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId }),
      });
      const json = await res.json();
      if (json.success) alert(`Re-scanned ${partnerId} ✅`);
      else alert(json.error || "Failed to rescan");
    } catch (err) {
      console.error("Re-scan error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleReScan} disabled={loading} size="sm" className="bg-blue-600">
      {loading ? (
        <>
          <User className="animate-spin w-4 h-4 mr-1" /> Scanning…
        </>
      ) : (
        <>
          <RefreshCcw className="w-4 h-4 mr-1" /> Re-Scan
        </>
      )}
    </Button>
  );
}
