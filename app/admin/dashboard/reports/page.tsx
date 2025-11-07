// app/admin/dashboard/reports/page.tsx
"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type ReportStats = {
  totalBookings: number;
  totalRevenue: number;
  totalPartners: number;
  totalSettlements: number;
};

export default function AdminReportsPage() {
  const [stats, setStats] = useState<ReportStats>({
    totalBookings: 0,
    totalRevenue: 0,
    totalPartners: 0,
    totalSettlements: 0,
  });

  const [chartData, setChartData] = useState<
    { date: string; bookings: number; revenue: number }[]
  >([]);

  useEffect(() => {
    const unsubBookings = onSnapshot(
      query(collection(db, "bookings"), orderBy("createdAt", "desc")),
      (snap) => {
        const all = snap.docs.map((d) => d.data() as any);
        const totalRevenue = all.reduce(
          (sum, b) => sum + Number(b.amount || 0),
          0
        );
        const today = new Date();
        const last7 = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date();
          d.setDate(today.getDate() - i);
          return { date: d.toISOString().slice(0, 10), bookings: 0, revenue: 0 };
        });

        all.forEach((b) => {
          const key = (b.createdAt?.toDate
            ? b.createdAt.toDate().toISOString()
            : b.date || ""
          ).slice(0, 10);
          const row = last7.find((x) => x.date === key);
          if (row) {
            row.bookings += 1;
            row.revenue += Number(b.amount || 0);
          }
        });

        setChartData(last7.reverse());
        setStats((s) => ({ ...s, totalBookings: all.length, totalRevenue }));
      }
    );

    const unsubPartners = onSnapshot(collection(db, "partners"), (snap) => {
      setStats((s) => ({ ...s, totalPartners: snap.size }));
    });

    const unsubSettlements = onSnapshot(
      collection(db, "settlements"),
      (snap) => setStats((s) => ({ ...s, totalSettlements: snap.size }))
    );

    return () => {
      unsubBookings();
      unsubPartners();
      unsubSettlements();
    };
  }, []);

  return (
    <DashboardLayout title="Admin • Reports & Analytics">
      <div className="mb-8 rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">
          Platform Overview
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Bookings", value: stats.totalBookings },
            {
              label: "Total Revenue",
              value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`,
            },
            { label: "Partners", value: stats.totalPartners },
            { label: "Settlements", value: stats.totalSettlements },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl bg-gray-50 p-4 text-center shadow-sm"
            >
              <div className="text-2xl font-bold text-gray-800">
                {card.value}
              </div>
              <p className="text-sm text-gray-600">{card.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-800">
          Revenue & Bookings (Last 7 Days)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              name="Revenue"
            />
            <Line
              type="monotone"
              dataKey="bookings"
              stroke="#10b981"
              name="Bookings"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </DashboardLayout>
  );
}
