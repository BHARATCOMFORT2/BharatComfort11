"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, RefreshCcw, Filter, Calendar } from "lucide-react";
import { exportFinanceCSV, exportFinancePDF } from "@/lib/utils/exportFinanceReport";

export default function AdminFinancePage() {
  const [activeTab, setActiveTab] = useState("settlements");
  const [loading, setLoading] = useState(true);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalSettlements: 0,
    totalWithdrawals: 0,
    totalReferrals: 0,
    totalPayouts: 0,
  });

  // Date Filter
  const [dateRange, setDateRange] = useState("month"); // today | week | month | custom
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  useEffect(() => {
    loadFinanceData();
  }, [dateRange, customStart, customEnd]);

  const getDateRange = () => {
    const now = new Date();
    let startDate = new Date();

    if (dateRange === "today") {
      startDate.setHours(0, 0, 0, 0);
    } else if (dateRange === "week") {
      startDate.setDate(now.getDate() - 7);
    } else if (dateRange === "month") {
      startDate.setDate(now.getDate() - 30);
    } else if (dateRange === "custom" && customStart && customEnd) {
      startDate = new Date(customStart);
      return {
        start: Timestamp.fromDate(startDate),
        end: Timestamp.fromDate(new Date(customEnd)),
      };
    }
    return {
      start: Timestamp.fromDate(startDate),
      end: Timestamp.fromDate(now),
    };
  };

  async function loadFinanceData() {
    try {
      setLoading(true);
      const { start, end } = getDateRange();

      // Queries with date filters
      const settlementQuery = query(
        collection(db, "settlements"),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end),
        orderBy("createdAt", "desc")
      );
      const withdrawQuery = query(
        collection(db, "withdraw_requests"),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end),
        orderBy("createdAt", "desc")
      );
      const referralQuery = query(
        collection(db, "referrals"),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end),
        orderBy("createdAt", "desc")
      );

      const [settleSnap, withdrawSnap, referralSnap] = await Promise.all([
        getDocs(settlementQuery),
        getDocs(withdrawQuery),
        getDocs(referralQuery),
      ]);

      const settlementsData = settleSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const withdrawalData = withdrawSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const referralData = referralSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Totals
      const totalSettlements = settlementsData
        .filter((s) => s.status === "paid")
        .reduce((a, b) => a + (Number(b.amount) || 0), 0);
      const totalWithdrawals = withdrawalData
        .filter((s) => s.status === "paid")
        .reduce((a, b) => a + (Number(b.amount) || 0), 0);
      const totalReferrals = referralData.reduce(
        (a, b) => a + (Number(b.rewardAmount) || 0),
        0
      );
      const totalPayouts = totalSettlements + totalWithdrawals + totalReferrals;

      setSettlements(settlementsData);
      setWithdrawals(withdrawalData);
      setReferrals(referralData);
      setSummary({
        totalSettlements,
        totalWithdrawals,
        totalReferrals,
        totalPayouts,
      });
    } catch (err) {
      console.error("Finance data load error:", err);
    } finally {
      setLoading(false);
    }
  }

  const currentData =
    activeTab === "settlements"
      ? settlements
      : activeTab === "withdrawals"
      ? withdrawals
      : referrals;

  const format = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between mb-5 gap-3">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="text-green-600" /> Finance Analytics Center
        </h2>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={loadFinanceData}
            className="bg-gray-700 hover:bg-gray-800 flex items-center gap-1"
          >
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
          <Button
            onClick={() => exportFinanceCSV(currentData)}
            className="bg-green-600 hover:bg-green-700"
          >
            Export CSV
          </Button>
          <Button
            onClick={() => exportFinancePDF(summary, currentData)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      <div className="flex flex-wrap gap-2 mb-6 items-center">
        {["today", "week", "month"].map((range) => (
          <Button
            key={range}
            onClick={() => setDateRange(range)}
            variant={dateRange === range ? "default" : "outline"}
            className={
              dateRange === range
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700"
            }
          >
            <Calendar className="mr-2 h-4 w-4" />{" "}
            {range === "today"
              ? "Today"
              : range === "week"
              ? "This Week"
              : "This Month"}
          </Button>
        ))}

        {/* Custom Range */}
        <Button
          onClick={() => setDateRange("custom")}
          variant={dateRange === "custom" ? "default" : "outline"}
          className={
            dateRange === "custom"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700"
          }
        >
          <Calendar className="mr-2 h-4 w-4" /> Custom
        </Button>

        {dateRange === "custom" && (
          <div className="flex gap-2 items-center ml-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="border p-2 rounded-lg"
            />
            <span>to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="border p-2 rounded-lg"
            />
          </div>
        )}
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Settlements</p>
            <h3 className="text-xl font-semibold text-green-700">
              {format(summary.totalSettlements)}
            </h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Withdrawals</p>
            <h3 className="text-xl font-semibold text-blue-700">
              {format(summary.totalWithdrawals)}
            </h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Referral Rewards</p>
            <h3 className="text-xl font-semibold text-indigo-700">
              {format(summary.totalReferrals)}
            </h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Payouts</p>
            <h3 className="text-xl font-semibold text-gray-900">
              {format(summary.totalPayouts)}
            </h3>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {["settlements", "withdrawals", "referrals"].map((tab) => (
          <Button
            key={tab}
            onClick={() => setActiveTab(tab)}
            variant={activeTab === tab ? "default" : "outline"}
            className={
              activeTab === tab ? "bg-blue-600 text-white" : "bg-white text-gray-700"
            }
          >
            <Filter className="mr-2 h-4 w-4" />{" "}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>

      {/* Data Table */}
      {loading ? (
        <p className="text-gray-500">Loading data...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700 border-b">
              <tr>
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">User / Partner</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{r.id.slice(0, 8)}</td>
                  <td className="p-3">
                    {r.partnerId || r.userId || r.referrerId || "--"}
                  </td>
                  <td className="p-3">{format(r.amount || r.rewardAmount || 0)}</td>
                  <td
                    className={`p-3 capitalize ${
                      r.status === "paid"
                        ? "text-green-600"
                        : r.status === "pending"
                        ? "text-yellow-600"
                        : r.status === "rejected"
                        ? "text-red-600"
                        : "text-blue-600"
                    }`}
                  >
                    {r.status || "completed"}
                  </td>
                  <td className="p-3 text-gray-500">
                    {r.createdAt?.toDate
                      ? r.createdAt.toDate().toLocaleDateString()
                      : "--"}
                  </td>
                </tr>
              ))}
              {currentData.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-500 text-center" colSpan={5}>
                    No records found for {activeTab}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
