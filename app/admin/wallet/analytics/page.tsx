"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { toast, Toaster } from "sonner";

/* ============================================================
   📊 Wallet Analytics Dashboard
============================================================ */

interface ChartPoint {
  month: string;
  credits: number;
  debits: number;
}

interface TopReferrer {
  name: string;
  total: number;
}

export default function WalletAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<ChartPoint[]>([]);
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [totalGrowth, setTotalGrowth] = useState<{ date: string; balance: number }[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch("/api/admin/wallet/analytics");
        if (!res.ok) throw new Error("Failed to load analytics");
        const data = await res.json();
        setMonthlyData(data.monthly || []);
        setTopReferrers(data.topReferrers || []);
        setTotalGrowth(data.growth || []);
      } catch (err) {
        console.error(err);
        toast.error("⚠️ Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <Toaster richColors />
        <h1 className="text-2xl font-semibold mb-4">Wallet Analytics</h1>
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <Toaster richColors />
      <div>
        <h1 className="text-2xl font-semibold">Wallet Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Monthly trends, top referrers, and platform wallet growth.
        </p>
      </div>

      {/* Monthly Credits vs Debits */}
      <div className="border rounded-xl p-4 shadow-sm">
        <h2 className="font-semibold mb-3">Monthly Credits vs Debits</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="credits" fill="#22c55e" name="Credits (₹)" />
            <Bar dataKey="debits" fill="#ef4444" name="Debits (₹)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Referrers */}
      <div className="border rounded-xl p-4 shadow-sm">
        <h2 className="font-semibold mb-3">Top 5 Referrers (by Wallet Rewards)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topReferrers}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill="#3b82f6" name="Total Reward ₹" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Total Wallet Growth */}
      <div className="border rounded-xl p-4 shadow-sm">
        <h2 className="font-semibold mb-3">Cumulative Wallet Balance Growth</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={totalGrowth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="balance" stroke="#0ea5e9" name="Total Wallet ₹" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
