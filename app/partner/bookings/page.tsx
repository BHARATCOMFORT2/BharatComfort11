"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase-client";
import { onAuthStateChanged } from "firebase/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { apiFetch } from "@/lib/apiFetch";

import {
LineChart,
Line,
XAxis,
YAxis,
Tooltip,
CartesianGrid,
ResponsiveContainer,
BarChart,
Bar,
} from "recharts";

type Booking = {
id: string;
listingId?: string;
guestName?: string;
amount?: number;
status?: string;
checkIn?: string;
checkOut?: string;
};

export default function PartnerBookingsPage() {
const router = useRouter();

const [loading, setLoading] = useState(true);
const [bookings, setBookings] = useState<Booking[]>([]);
const [chartData, setChartData] = useState<any[]>([]);
const [topListings, setTopListings] = useState<any[]>([]);
const [error, setError] = useState<string | null>(null);

/* ---------------- REVENUE CALC ---------------- */

const totalRevenue = useMemo(() => {
return bookings.reduce((sum, b) => sum + Number(b.amount || 0), 0);
}, [bookings]);

/* ---------------- TOTAL BOOKINGS ---------------- */

const totalBookings = useMemo(() => bookings.length, [bookings]);

/* ---------------- AUTH + DATA LOAD ---------------- */

useEffect(() => {
const unsub = onAuthStateChanged(auth, async (user) => {
if (!user) {
router.replace("/auth/login");
return;
}

```
  try {
    await user.getIdToken(true);

    /* ---------- LOAD BOOKINGS ---------- */

    const bookingRes = await apiFetch("/api/partners/bookings");
    const bookingJson = await bookingRes.json();

    if (bookingJson?.ok) {
      const list: Booking[] = bookingJson.bookings || [];
      setBookings(list);

      /* ---------- TOP LISTINGS ---------- */

      const grouped: Record<string, number> = {};

      list.forEach((b) => {
        const id = b.listingId || "unknown";
        grouped[id] = (grouped[id] || 0) + 1;
      });

      const sorted = Object.entries(grouped)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([listingId, count]) => ({
          listingId,
          count,
        }));

      setTopListings(sorted);
    }

    /* ---------- LOAD INSIGHTS ---------- */

    const insightsRes = await apiFetch("/api/partners/insights?days=7");
    const insights = await insightsRes.json();

    if (insights?.ok) {
      setChartData(
        (insights.bookingsPerDay || []).map((d: any) => ({
          date: new Date(d.day).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          }),
          count: d.count,
        }))
      );
    }
  } catch (err) {
    console.error("Partner bookings load error:", err);
    setError("Failed to load bookings.");
  } finally {
    setLoading(false);
  }
});

return () => unsub();
```

}, [router]);

if (loading)
return ( <p className="text-center py-12 text-gray-500">
Loading partner dashboard... </p>
);

if (error)
return ( <p className="text-center py-12 text-red-500">
{error} </p>
);

return (
<DashboardLayout
title="Partner Bookings"
profile={{ name: "Partner", role: "partner" }}
>
{/* ---------------- STATS ---------------- */}

```
  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">

    <div className="bg-white p-6 rounded-xl shadow text-center">
      <h2 className="text-3xl font-bold">{totalBookings}</h2>
      <p className="text-gray-500">Total Bookings</p>
    </div>

    <div className="bg-white p-6 rounded-xl shadow text-center">
      <h2 className="text-3xl font-bold">
        ₹{totalRevenue.toLocaleString("en-IN")}
      </h2>
      <p className="text-gray-500">Revenue</p>
    </div>

    <div className="bg-white p-6 rounded-xl shadow text-center">
      <h2 className="text-3xl font-bold">
        {
          bookings.filter((b) => b.status === "confirmed").length
        }
      </h2>
      <p className="text-gray-500">Confirmed</p>
    </div>

    <div className="bg-white p-6 rounded-xl shadow text-center">
      <h2 className="text-3xl font-bold">
        {
          bookings.filter((b) => b.status === "completed").length
        }
      </h2>
      <p className="text-gray-500">Completed</p>
    </div>

  </div>

  {/* ---------------- CHART ---------------- */}

  <div className="bg-white p-6 rounded-2xl shadow mb-10">
    <h3 className="font-semibold mb-4">
      Bookings (Last 7 Days)
    </h3>

    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line
          dataKey="count"
          stroke="#16a34a"
          strokeWidth={3}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>

  {/* ---------------- TOP LISTINGS ---------------- */}

  <div className="bg-white p-6 rounded-2xl shadow mb-10">
    <h3 className="font-semibold mb-4">
      Top Performing Listings
    </h3>

    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={topListings}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="listingId" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="#2563eb" />
      </BarChart>
    </ResponsiveContainer>
  </div>

  {/* ---------------- BOOKINGS TABLE ---------------- */}

  <div className="bg-white p-6 rounded-2xl shadow">

    <h3 className="text-xl font-semibold mb-6">
      Your Bookings
    </h3>

    {bookings.length === 0 ? (
      <p className="text-gray-500">
        No bookings yet.
      </p>
    ) : (
      <div className="space-y-3">

        {bookings.map((b) => (

          <div
            key={b.id}
            className="border rounded-lg p-4 flex justify-between items-center"
          >

            <div>
              <p className="font-semibold">
                {b.guestName || "Guest"}
              </p>

              <p className="text-sm text-gray-500">
                Booking ID: {b.id}
              </p>

              {b.checkIn && (
                <p className="text-sm text-gray-500">
                  {b.checkIn} → {b.checkOut}
                </p>
              )}
            </div>

            <div className="text-right">

              <p className="font-semibold text-green-600">
                ₹{b.amount}
              </p>

              <span
                className={`text-xs px-2 py-1 rounded ${
                  b.status === "confirmed"
                    ? "bg-blue-100 text-blue-700"
                    : b.status === "completed"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100"
                }`}
              >
                {b.status || "pending"}
              </span>

            </div>

          </div>

        ))}

      </div>
    )}

  </div>
</DashboardLayout>
```

);
}
