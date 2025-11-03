"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  TrendingUp,
  FileText,
  AlertTriangle,
  IndianRupee,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { exportFinanceCSV, exportFinancePDF } from "@/lib/utils/exportFinanceReport";

export default function AdminFinanceDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalPayouts: 0,
    pendingSettlements: 0,
    gstCollected: 0,
    totalCommission: 0,
    disputedCount: 0,
  });

  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinance = async () => {
      try {
        const settlementsSnap = await getDocs(
          query(collection(db, "settlements"), orderBy("createdAt", "desc"))
        );

        const settlements = settlementsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        const totalPayouts = settlements
          .filter((s) => s.status === "paid")
          .reduce((sum, s) => sum + (s.amount || 0), 0);

        const pendingSettlements = settlements.filter((s) =>
          ["pending", "approved", "on_hold"].includes(s.status)
        ).length;

        const totalRevenue = totalPayouts * 1.1; // 10% margin assumption
        const totalCommission = totalPayouts * 0.1;
        const gstCollected = totalCommission * 0.18;

        // Disputes
        const disputesSnap = await getDocs(collection(db, "settlement_disputes"));
        const disputedCount = disputesSnap.docs.length;

        // Monthly chart data
        const months = Array.from({ length: 12 }, (_, i) =>
          new Date(0, i).toLocaleString("default", { month: "short" })
        );

        const chartData = months.map((m, idx) => {
          const monthSettlements = settlements.filter(
            (s) => new Date(s.createdAt?.seconds * 1000).getMonth() === idx
          );
          return {
            month: m,
            Payouts: monthSettlements
              .filter((s) => s.status === "paid")
              .reduce((sum, s) => sum + (s.amount || 0), 0),
            Revenue: monthSettlements
              .filter((s) => ["approved", "paid"].includes(s.status))
              .reduce((sum, s) => sum + (s.amount || 0) * 1.1, 0),
          };
        });

        setStats({
          totalRevenue,
          totalPayouts,
          pendingSettlements,
          gstCollected,
          totalCommission,
          disputedCount,
        });
        setMonthlyData(chartData);
      } catch (error) {
        console.error("Admin finance fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFinance();
  }, []);

  const format = (n: number) => n.toLocaleString("en-IN");

  if (loading) {
    return <div className="p-6 text-gray-500">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-5 flex items-center">
        <Wallet className="mr-2 text-green-600" /> Admin Finance Dashboard
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <h3 className="text-xl font-semibold text-green-700">
              ₹{format(stats.totalRevenue)}
            </h3>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Payouts</p>
            <h3 className="text-xl font-semibold text-blue-700">
              ₹{format(stats.totalPayouts)}
            </h3>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Pending Settlements</p>
            <h3 className="text-xl font-semibold text-yellow-700">
              {stats.pendingSettlements}
            </h3>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Commission</p>
            <h3 className="text-xl font-semibold text-indigo-700">
              ₹{format(stats.totalCommission)}
            </h3>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">GST (18%)</p>
            <h3 className="text-xl font-semibold text-purple-700">
              ₹{format(stats.gstCollected)}
            </h3>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Disputes</p>
            <h3 className="text-xl font-semibold text-red-700">
              {stats.disputedCount}
            </h3>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Chart */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="mr-2 text-blue-600" /> Monthly Performance
          </h3>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="Revenue" />
                <Bar dataKey="Payouts" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Export Section */}
      <div className="flex gap-3 mb-6">
        <Button
          onClick={() => exportFinanceCSV(monthlyData)}
          className="bg-green-600 hover:bg-green-700"
        >
          <FileText className="mr-2" /> Export CSV
        </Button>
        <Button
          onClick={() => exportFinancePDF(stats, monthlyData)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <IndianRupee className="mr-2" /> Export PDF
        </Button>
      </div>

      {/* Quick Insights */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <AlertTriangle className="mr-2 text-yellow-600" /> Quick Insights
          </h3>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            <li>
              <b>{stats.pendingSettlements}</b> settlements are pending approval or payout.
            </li>
            <li>
              <b>{stats.disputedCount}</b> disputes are under review.
            </li>
            <li>
              Estimated <b>GST collected:</b> ₹{format(stats.gstCollected)}.
            </li>
            <li>
              Commission margin currently at <b>10%</b> base rate.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
