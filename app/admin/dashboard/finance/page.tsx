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
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Wallet,
  RefreshCcw,
  TrendingUp,
  X,
  Receipt,
  Percent,
  Building2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { exportFinanceCSV, exportFinancePDF } from "@/lib/utils/exportFinanceReport";

/* =========================================================
   🔹 TYPES
========================================================= */
interface SettlementRecord {
  id: string;
  partnerId?: string;
  partnerType?: "individual" | "company" | "firm" | "llp";
  amount?: number;
  status?: "pending" | "paid" | "failed";
  createdAt?: Timestamp;
}

/* =========================================================
   🔹 Modal Component
========================================================= */
function Modal({
  isOpen,
  title,
  onClose,
  children,
}: {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-[95%] max-w-4xl rounded-2xl bg-white p-6 shadow-xl overflow-y-auto max-h-[90vh]">
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* =========================================================
   🔹 Helper Functions
========================================================= */
const money = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

const tdsRateFor = (partnerType?: string) => {
  return partnerType === "company" ? 0.05 : 0.01;
};

/* =========================================================
   🔹 Main Component
========================================================= */
export default function AdminFinancePage() {
  const [loading, setLoading] = useState(true);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [dailyRecords, setDailyRecords] = useState<SettlementRecord[]>([]);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");

  const [summary, setSummary] = useState({
    totalSettlements: 0,
    totalPayouts: 0,
  });

  const [gstSummary, setGstSummary] = useState({
    totalCommission: 0,
    gstCollected: 0,
    gstPayable: 0,
  });

  const [tdsSummary, setTdsSummary] = useState({
    tdsDeducted: 0,
    tdsPayable: 0,
    tdsDeposited: 0,
    pendingTds: 0,
  });

  const [dateRange, setDateRange] = useState<"today" | "week" | "month">("month");

  useEffect(() => {
    loadFinanceData();
  }, [dateRange]);

  const getDateRange = () => {
    const now = new Date();
    const startDate = new Date();

    if (dateRange === "today") startDate.setHours(0, 0, 0, 0);
    else if (dateRange === "week") startDate.setDate(now.getDate() - 7);
    else if (dateRange === "month") startDate.setDate(1);

    return {
      start: Timestamp.fromDate(startDate),
      end: Timestamp.fromDate(now),
    };
  };

  async function loadFinanceData() {
    setLoading(true);
    try {
      const { start, end } = getDateRange();

      const settleSnap = await getDocs(
        query(
          collection(db, "settlements"),
          where("createdAt", ">=", start),
          where("createdAt", "<=", end),
          orderBy("createdAt", "desc")
        )
      );
      let settlementsData: SettlementRecord[] = settleSnap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as SettlementRecord) })
      );

      const partnerIds = Array.from(
        new Set(settlementsData.map((s) => s.partnerId).filter(Boolean))
      ) as string[];

      const partnersById: Record<string, { partnerType?: string }> = {};
      if (partnerIds.length) {
        const batchSize = 10;
        for (let i = 0; i < partnerIds.length; i += batchSize) {
          const chunk = partnerIds.slice(i, i + batchSize);
          const ps = await getDocs(
            query(collection(db, "partners"), where("uid", "in", chunk))
          );
          ps.docs.forEach((p) => {
            const data = p.data() as any;
            partnersById[data.uid] = {
              partnerType: data.partnerType || data.type || "individual",
            };
          });
        }
      }

      settlementsData = settlementsData.map((s) => ({
        ...s,
        partnerType: partnersById[s.partnerId || ""]?.partnerType || "individual",
      }));

      const paid = settlementsData.filter((s) => s.status === "paid");
      const totalSettlements = paid.reduce(
        (a, b) => a + (Number(b.amount) || 0),
        0
      );
      const totalCommission = Math.round(totalSettlements * 0.1);
      const gstCollected = Math.round(totalCommission * 0.18);
      const gstPayable = Math.round(gstCollected * 0.95);

      let tdsDeducted = 0;
      for (const s of paid) {
        const rate = tdsRateFor(s.partnerType);
        tdsDeducted += Math.round((Number(s.amount) || 0) * rate);
      }

      const tdsPayable = tdsDeducted;
      const tdsDeposited = Math.round(tdsPayable * 0.9);
      const pendingTds = tdsPayable - tdsDeposited;

      const grouped = settlementsData.reduce((acc: any[], cur) => {
        const date = cur.createdAt?.toDate().toLocaleDateString("en-IN");
        const ex = acc.find((x) => x.date === date);
        const amt = Number(cur.amount) || 0;
        if (ex) ex.total += amt;
        else acc.push({ date, total: amt });
        return acc;
      }, []);
      grouped.sort(
        (a, b) => new Date(a.date as any).getTime() - new Date(b.date as any).getTime()
      );

      setSettlements(settlementsData);
      setChartData(grouped);
      setSummary({ totalSettlements, totalPayouts: totalSettlements });
      setGstSummary({ totalCommission, gstCollected, gstPayable });
      setTdsSummary({ tdsDeducted, tdsPayable, tdsDeposited, pendingTds });
    } catch (err) {
      console.error("Finance load error:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleBarClick = (data: any) => {
    if (!data?.activeLabel) return;
    const date = data.activeLabel;
    const dayRecords = settlements.filter(
      (r) => r.createdAt?.toDate().toLocaleDateString("en-IN") === date
    );
    setSelectedDate(date);
    setDailyRecords(dayRecords);
    setShowDayModal(true);
  };

  const exportFullTaxReport = () => {
    const reportData = settlements.map((r) => {
      const gross = Number(r.amount) || 0;
      const commission = Math.round(gross * 0.1);
      const gst = Math.round(commission * 0.18);
      const tds = Math.round(gross * tdsRateFor(r.partnerType));
      const net = gross - (commission + gst + tds);
      return {
        id: r.id,
        partnerId: r.partnerId || "--",
        partnerType: r.partnerType || "individual",
        gross,
        commission,
        gst,
        tds,
        net,
        status: r.status || "done",
        date: r.createdAt?.toDate().toLocaleDateString("en-IN"),
      };
    });

    exportFinanceCSV(reportData);
    exportFinancePDF({ ...summary, ...gstSummary, ...tdsSummary }, reportData);
  };

  /* =========================================================
     🔹 JSX Rendering
  ========================================================= */
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between mb-5 gap-3">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="text-green-600" /> Finance Analytics + Tax Center
        </h2>
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm">
            {(["today", "week", "month"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1 rounded ${
                  dateRange === r ? "bg-blue-600 text-white" : "text-gray-700"
                }`}
              >
                {r === "today" ? "Today" : r === "week" ? "This Week" : "This Month"}
              </button>
            ))}
          </div>
          <Button onClick={loadFinanceData} className="bg-gray-700 hover:bg-gray-800">
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button onClick={exportFullTaxReport} className="bg-indigo-600 hover:bg-indigo-700">
            <Receipt className="mr-2 h-4 w-4" /> Export Full Tax Report
          </Button>
        </div>
      </div>

      {/* GST + TDS Summary */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card className="border-l-4 border-indigo-500">
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-indigo-700">
              <Percent className="text-indigo-600" /> GST Summary
            </h3>
            <p>Total Commission: {money(gstSummary.totalCommission)}</p>
            <p>GST Collected (18%): {money(gstSummary.gstCollected)}</p>
            <p>GST Payable (after credits): {money(gstSummary.gstPayable)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-green-500">
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-green-700">
              <Building2 className="text-green-600" /> TDS Summary
            </h3>
            <p>TDS Deducted: {money(tdsSummary.tdsDeducted)}</p>
            <p>TDS Payable: {money(tdsSummary.tdsPayable)}</p>
            <p>TDS Deposited: {money(tdsSummary.tdsDeposited)}</p>
            <p className="font-semibold">
              Pending TDS:{" "}
              <span
                className={
                  tdsSummary.pendingTds > 0 ? "text-red-600" : "text-green-600"
                }
              >
                {money(tdsSummary.pendingTds)}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="mr-2 text-blue-600" /> Daily Payout Trends
          </h3>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} onClick={handleBarClick}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Daily Modal */}
      <Modal
        isOpen={showDayModal}
        title={`Day-wise Tax Breakdown (${selectedDate})`}
        onClose={() => setShowDayModal(false)}
      >
        {dailyRecords.length ? (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700 border-b">
              <tr>
                <th className="p-3 text-left">Partner</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Gross</th>
                <th className="p-3 text-left">Commission</th>
                <th className="p-3 text-left">GST</th>
                <th className="p-3 text-left">TDS</th>
                <th className="p-3 text-left">Net Payable</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {dailyRecords.map((r) => {
                const gross = Number(r.amount) || 0;
                const commission = Math.round(gross * 0.1);
                const gst = Math.round(commission * 0.18);
                const tds = Math.round(gross * tdsRateFor(r.partnerType));
                const net = gross - (commission + gst + tds);
                return (
                  <tr key={r.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{r.partnerId}</td>
                    <td className="p-3 capitalize">{r.partnerType || "individual"}</td>
                    <td className="p-3">{money(gross)}</td>
                    <td className="p-3 text-yellow-700">{money(commission)}</td>
                    <td className="p-3 text-purple-700">{money(gst)}</td>
                    <td className="p-3 text-red-700">{money(tds)}</td>
                    <td className="p-3 text-green-700 font-semibold">{money(net)}</td>
                    <td className="p-3 capitalize text-blue-600">{r.status || "done"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-center text-gray-500 py-6">
            No settlements found for this day.
          </p>
        )}
      </Modal>
    </div>
  );
}
