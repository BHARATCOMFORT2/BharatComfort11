"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FileText, Wallet2, TrendingUp, Clock } from "lucide-react";
import { exportFinanceCSV, exportFinancePDF } from "@/lib/utils/exportFinanceReport";
import PartnerDisputeModal from "@/components/settlements/PartnerDisputeModal";

export default function PartnerFinanceDashboard() {
  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingAmount: 0,
    totalSettlements: 0,
    commissionPaid: 0,
    gst: 0,
    latestSettlement: null as any,
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [recentSettlements, setRecentSettlements] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"open" | "resolved">("open");
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinance = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        const token = await user.getIdToken();

        // Fetch settlements
        const settlementsRef = collection(db, "settlements");
        const q = query(
          settlementsRef,
          where("partnerId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const paid = data.filter((s) => s.status === "paid");
        const pending = data.filter((s) =>
          ["pending", "approved"].includes(s.status)
        );

        const totalEarnings = paid.reduce((sum, s) => sum + (s.amount || 0), 0);
        const pendingAmount = pending.reduce((sum, s) => sum + (s.amount || 0), 0);
        const commissionPaid = totalEarnings * 0.1;
        const gst = commissionPaid * 0.18;
        const latestSettlement = paid[0] || null;

        const recent = data.slice(0, 5);
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

        // Fetch disputes
        const disputesSnap = await getDocs(
          query(
            collection(db, "settlement_disputes"),
            where("partnerId", "==", user.uid)
          )
        );
        const allDisputes = disputesSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setStats({
          totalEarnings,
          pendingAmount,
          totalSettlements: data.length,
          commissionPaid,
          gst,
          latestSettlement,
        });
        setRecentSettlements(recent);
        setMonthlyData(chartData);
        setDisputes(allDisputes);
      } catch (err) {
        console.error("Finance fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFinance();
  }, []);

  const format = (n: number) => n.toLocaleString("en-IN");

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">💰 My Finance Dashboard</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: "Total Earnings", val: stats.totalEarnings, color: "text-green-700" },
              { label: "Pending Amount", val: stats.pendingAmount, color: "text-yellow-700" },
              { label: "Total Settlements", val: stats.totalSettlements, color: "text-blue-700" },
              { label: "Commission Paid", val: stats.commissionPaid, color: "text-indigo-700" },
              { label: "GST (18%)", val: stats.gst, color: "text-purple-700" },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">{item.label}</p>
                  <h3 className={`text-xl font-semibold ${item.color}`}>
                    ₹{format(item.val)}
                  </h3>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chart */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-4">📊 Monthly Earnings</h3>
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

          {/* Export */}
          <div className="flex gap-3 mb-6">
            <Button onClick={() => exportFinanceCSV(monthlyData)} className="bg-green-600 hover:bg-green-700">
              <FileText className="mr-2" /> Export Excel
            </Button>
            <Button onClick={() => exportFinancePDF(stats, monthlyData)} className="bg-blue-600 hover:bg-blue-700">
              <TrendingUp className="mr-2" /> Export PDF
            </Button>
          </div>

          {/* Last Settlement Summary */}
          {stats.latestSettlement ? (
            <Card className="mb-6">
              <CardContent className="p-5">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Wallet2 className="mr-2 text-green-600" /> Last Settlement
                </h3>
                <p>
                  <b>ID:</b> {stats.latestSettlement.id}
                </p>
                <p>
                  <b>Status:</b> {stats.latestSettlement.status.toUpperCase()}
                </p>
                <p>
                  <b>Amount:</b> ₹{format(stats.latestSettlement.amount)}
                </p>
                <p>
                  <b>Date:</b>{" "}
                  {new Date(
                    stats.latestSettlement.createdAt?.seconds * 1000
                  ).toLocaleDateString("en-IN")}
                </p>
                {stats.latestSettlement.invoiceUrl && (
                  <a
                    href={stats.latestSettlement.invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline text-sm mt-2 inline-block"
                  >
                    <FileText className="inline mr-1" /> View Invoice
                  </a>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-6">
              <CardContent className="text-center text-gray-500">
                <Clock className="mx-auto mb-2 text-gray-400" />
                No settlements yet.
              </CardContent>
            </Card>
          )}

          {/* Recent Settlements */}
          <Card className="mb-6">
            <CardContent className="p-5">
              <h3 className="text-lg font-semibold mb-3">📋 Recent Settlements</h3>
              {recentSettlements.length === 0 ? (
                <p className="text-gray-500 text-sm text-center">
                  No recent settlements.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {recentSettlements.map((s) => (
                    <li key={s.id} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">
                          ₹{format(s.amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(s.createdAt?.seconds * 1000).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-medium ${
                          s.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : s.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : s.status === "approved"
                            ? "bg-blue-100 text-blue-700"
                            : s.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {s.status.toUpperCase()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Dispute Tracking */}
          <Card>
            <CardContent className="p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">⚠️ Dispute Tracking</h3>
                <div className="flex gap-2">
                  <Button
                    variant={activeTab === "open" ? "default" : "outline"}
                    onClick={() => setActiveTab("open")}
                  >
                    Open
                  </Button>
                  <Button
                    variant={activeTab === "resolved" ? "default" : "outline"}
                    onClick={() => setActiveTab("resolved")}
                  >
                    Resolved
                  </Button>
                </div>
              </div>

              {disputes.filter((d) =>
                activeTab === "open" ? d.status === "open" : d.status !== "open"
              ).length === 0 ? (
                <p className="text-gray-500 text-sm text-center">
                  No {activeTab} disputes.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left">Settlement ID</th>
                        <th className="px-4 py-2 text-left">Reason</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disputes
                        .filter((d) =>
                          activeTab === "open" ? d.status === "open" : d.status !== "open"
                        )
                        .map((d) => (
                          <tr
                            key={d.id}
                            onClick={() => setSelectedDispute(d)}
                            className="border-b hover:bg-gray-50 cursor-pointer"
                          >
                            <td className="px-4 py-2">{d.settlementId}</td>
                            <td className="px-4 py-2">{d.reason}</td>
                            <td className="px-4 py-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  d.status === "open"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {d.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              {new Date(d.createdAt?.seconds * 1000).toLocaleDateString("en-IN")}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dispute Detail Modal */}
          {selectedDispute && (
            <PartnerDisputeModal
              dispute={selectedDispute}
              onClose={() => setSelectedDispute(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
