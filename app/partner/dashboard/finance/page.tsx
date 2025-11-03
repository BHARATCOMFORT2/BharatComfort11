"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { exportFinanceCSV, exportFinancePDF } from "@/lib/utils/exportFinanceReport";
import { FileText, TrendingUp, Wallet2, Clock } from "lucide-react";

export default function PartnerFinanceDashboard() {
  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingAmount: 0,
    totalSettlements: 0,
    commissionPaid: 0,
    gst: 0,
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPartnerFinance = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        const token = await user.getIdToken();
        const settlementsRef = collection(db, "settlements");
        const q = query(settlementsRef, where("partnerId", "==", user.uid), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);

        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const paid = data.filter((s) => s.status === "paid");
        const pending = data.filter((s) => ["pending", "approved"].includes(s.status));

        const totalEarnings = paid.reduce((sum, s) => sum + (s.amount || 0), 0);
        const pendingAmount = pending.reduce((sum, s) => sum + (s.amount || 0), 0);
        const commissionPaid = totalEarnings * 0.1;
        const gst = commissionPaid * 0.18;

        // Monthly chart
        const months = Array.from({ length: 12 }, (_, i) =>
          new Date(0, i).toLocaleString("default", { month: "short" })
        );
        const chartData = months.map((m, idx) => {
          const monthSettlements = paid.filter(
            (s) => new Date(s.createdAt?.seconds * 1000).getMonth() === idx
          );
          return {
            month: m,
            Earnings: monthSettlements.reduce((sum, s) => sum + (s.amount || 0), 0),
          };
        });

        setStats({
          totalEarnings,
          pendingAmount,
          totalSettlements: data.length,
          commissionPaid,
          gst,
        });
        setMonthlyData(chartData);
      } catch (err) {
        console.error("Partner finance error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPartnerFinance();
  }, []);

  const format = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">💰 My Finance Dashboard</h2>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card className="border rounded-xl shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Total Earnings</p>
                <h3 className="text-xl font-semibold text-green-700">
                  ₹{format(stats.totalEarnings)}
                </h3>
              </CardContent>
            </Card>

            <Card className="border rounded-xl shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Pending Amount</p>
                <h3 className="text-xl font-semibold text-yellow-700">
                  ₹{format(stats.pendingAmount)}
                </h3>
              </CardContent>
            </Card>

            <Card className="border rounded-xl shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Total Settlements</p>
                <h3 className="text-xl font-semibold text-blue-700">
                  {format(stats.totalSettlements)}
                </h3>
              </CardContent>
            </Card>

            <Card className="border rounded-xl shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Commission Paid</p>
                <h3 className="text-xl font-semibold text-indigo-700">
                  ₹{format(stats.commissionPaid)}
                </h3>
              </CardContent>
            </Card>

            <Card className="border rounded-xl shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">GST on Commission</p>
                <h3 className="text-xl font-semibold text-purple-700">
                  ₹{format(stats.gst)}
                </h3>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-4">
                📊 Monthly Earnings Overview
              </h3>
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="Earnings" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Export Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => exportFinanceCSV(monthlyData)}
              className="bg-green-600 hover:bg-green-700"
            >
              <FileText className="mr-2" /> Export Excel
            </Button>
            <Button
              onClick={() => exportFinancePDF(stats, monthlyData)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <TrendingUp className="mr-2" /> Export PDF
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
