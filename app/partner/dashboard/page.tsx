"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase-client";
import { onAuthStateChanged } from "firebase/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PartnerListingsManager from "@/components/dashboard/PartnerListingsManager";
import { apiFetch } from "@/lib/apiFetch";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type PartnerProfile = {
  uid: string;
  displayName?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  profilePic?: string;
  status?: string;
  bank?: any;
  address?: Record<string, string>;
};

export default function PartnerDashboard() {
  const router = useRouter();

  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // stats + chart
  const [stats, setStats] = useState({
    listings: 0,
    bookings: 0,
    earnings: 0,
  });
  const [chartData, setChartData] = useState<{ date: string; count: number }[]>(
    []
  );
  const [bookings, setBookings] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [bookingsPage, setBookingsPage] = useState(1);

  // modals
  const [openBusinessModal, setOpenBusinessModal] = useState(false);
  const [openBankModal, setOpenBankModal] = useState(false);
  const [openSettlementModal, setOpenSettlementModal] = useState(false);

  const [bankDraft, setBankDraft] = useState<any>({});
  const [bizDraft, setBizDraft] = useState<any>({});
  const [eligibleBookings, setEligibleBookings] = useState<string[]>([]);
  const [settlementAmount, setSettlementAmount] = useState<number>(0);

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }

      setLoading(true);

      try {
        // profile
        const pRes = await fetch("/api/partners/profile", {
          credentials: "include",
        });
        const pJson = await pRes.json().catch(() => null);
        if (!mounted) return;

        const partnerObj = pJson?.partner || {};

        setProfile({
          uid: pJson?.uid || partnerObj.uid || user.uid,
          displayName:
            partnerObj.displayName ||
            partnerObj.businessName ||
            user.displayName ||
            "Partner",
          businessName: partnerObj.businessName || "",
          email: partnerObj.email || user.email || "",
          phone: partnerObj.phone || user.phoneNumber || "",
          profilePic: partnerObj.profilePic || null,
          status: partnerObj.status || "ACTIVE",
          bank: partnerObj.bank || null,
          address: partnerObj.address || null,
        });

        // bookings
        const bookingsRes = await apiFetch("/api/partners/bookings?limit=10");
        const bookingsJson = await bookingsRes.json().catch(() => null);
        if (bookingsJson?.ok && mounted) {
          const list = bookingsJson.bookings || [];
          setBookings(list);
          setHasMore(list.length >= 10);
          setStats((s) => ({
            ...s,
            bookings: bookingsJson.total || list.length,
            earnings:
              list.reduce(
                (a: number, b: any) => a + Number(b.amount || 0),
                0
              ) || 0,
          }));
        }

        // finance
        const financeRes = await apiFetch("/api/partners/finance");
        const fin = await financeRes.json().catch(() => null);
        if (fin?.ok && mounted) {
          setStats((s) => ({
            ...s,
            earnings: fin.totalEarnings ?? s.earnings,
          }));
        }

        // listings count
        const listingsRes = await apiFetch(
          "/api/partners/listings/list?limit=1"
        );
        const listingsJson = await listingsRes.json().catch(() => null);
        if (listingsJson?.ok && mounted) {
          setStats((s) => ({
            ...s,
            listings:
              listingsJson.total ??
              listingsJson.count ??
              listingsJson.listings?.length ??
              0,
          }));
        }

        // insights
        const insightsRes = await apiFetch("/api/partners/insights?days=7");
        const ins = await insightsRes.json().catch(() => null);
        if (mounted) {
          if (ins?.ok && Array.isArray(ins.bookingsPerDay)) {
            setChartData(
              ins.bookingsPerDay.map((d: any) => ({
                date: new Date(d.day).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                }),
                count: d.count,
              }))
            );
          } else {
            const today = new Date();
            const days = [...Array(7)].map((_, i) => {
              const d = new Date(today);
              d.setDate(today.getDate() - (6 - i));
              return {
                date: d.toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                }),
                count: 0,
              };
            });
            setChartData(days);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Dashboard load error", err);
        if (mounted) setLoading(false);
      }
    });

    return () => {
      unsub();
      mounted = false;
    };
  }, [router]);

  const loadMore = async () => {
    setBusy(true);
    try {
      const nextPage = bookingsPage + 1;
      const res = await apiFetch(
        `/api/partners/bookings?limit=10&page=${nextPage}`
      );
      const j = await res.json().catch(() => null);
      if (j?.ok) {
        setBookings((prev) => [...prev, ...(j.bookings || [])]);
        setBookingsPage(nextPage);
        setHasMore((j.bookings?.length || 0) >= 10);
      }
    } finally {
      setBusy(false);
    }
  };

  const saveBusiness = async () => {
    if (!profile?.uid) return;
    setBusy(true);
    try {
      const res = await fetch("/api/partners/profile/update", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: bizDraft.businessName || profile.businessName || "",
          phone: bizDraft.phone || profile.phone || "",
          address: bizDraft.address || profile.address || {},
        }),
      });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) setOpenBusinessModal(false);
    } finally {
      setBusy(false);
    }
  };

  const saveBank = async () => {
    if (!profile?.uid) return;
    setBusy(true);
    try {
      const res = await fetch("/api/partners/profile/update", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bank: bankDraft }),
      });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) setOpenBankModal(false);
    } finally {
      setBusy(false);
    }
  };

  const handleSettlementRequest = async () => {
    if (!profile) return;
    if (!eligibleBookings.length || settlementAmount <= 0) {
      return alert("Select bookings and enter amount");
    }
    setBusy(true);
    try {
      const res = await fetch("/api/partners/settlements/request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingIds: eligibleBookings,
          totalAmount: settlementAmount,
        }),
      });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) {
        alert("✅ Settlement request submitted!");
        setOpenSettlementModal(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const welcome = useMemo(
    () => profile?.businessName || profile?.displayName || "Partner",
    [profile]
  );

  if (loading)
    return <p className="text-center py-10">Loading dashboard…</p>;

  return (
    <DashboardLayout
      title="Partner Dashboard"
      profile={{
        name: welcome,
        role: "partner",
        profilePic: profile?.profilePic,
      }}
    >
      {/* Greeting */}
      <div className="mb-6 bg-white rounded-2xl p-6 shadow">
        <h1 className="text-2xl font-bold">Hello, {welcome} 👋</h1>
        <p className="text-gray-600">
          Manage your listings, bookings & payouts.
        </p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-6 mb-8">
        {[
          { label: "Listings", value: stats.listings },
          { label: "Bookings", value: stats.bookings },
          {
            label: "Earnings",
            value: `₹${stats.earnings.toLocaleString("en-IN")}`,
          },
        ].map((c) => (
          <div
            key={c.label}
            className="bg-white rounded-xl p-6 text-center shadow"
          >
            <h2 className="text-2xl font-bold">{c.value}</h2>
            <p className="text-gray-600">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-2xl shadow mb-10">
        <h3 className="font-semibold mb-4">Bookings (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line dataKey="count" stroke="#10b981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Listings */}
      <div className="bg-white p-6 rounded-2xl shadow mb-10">
        <h3 className="text-xl font-semibold mb-4">Your Listings</h3>
        <PartnerListingsManager />
      </div>

      {/* Recent Bookings */}
      <div className="bg-white p-6 rounded-2xl shadow mb-10">
        <h3 className="text-xl font-semibold mb-4">Recent Bookings</h3>
        {bookings.map((b) => (
          <div
            key={b.id}
            className="border rounded-lg p-3 mb-2 flex justify-between"
          >
            <span className="text-sm text-gray-800">{b.id}</span>
            <span className="text-gray-600">₹{b.amount}</span>
          </div>
        ))}
        {hasMore && (
          <div className="text-center mt-3">
            <button
              onClick={loadMore}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg"
            >
              {busy ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </div>

      {/* Business Modal */}
      {openBusinessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpenBusinessModal(false)}
          />
          <div className="relative z-10 w-[95%] max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Business Settings</h3>
              <button
                onClick={() => setOpenBusinessModal(false)}
                className="rounded-full p-2 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <label className="block text-sm">Business Name</label>
              <input
                className="border rounded-lg w-full p-2"
                value={bizDraft.businessName || profile?.businessName || ""}
                onChange={(e) =>
                  setBizDraft({
                    ...bizDraft,
                    businessName: e.target.value,
                  })
                }
              />
              <label className="block text-sm">Phone</label>
              <input
                className="border rounded-lg w-full p-2"
                value={bizDraft.phone || profile?.phone || ""}
                onChange={(e) =>
                  setBizDraft({ ...bizDraft, phone: e.target.value })
                }
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setOpenBusinessModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={saveBusiness}
                  disabled={busy}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg"
                >
                  {busy ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bank Modal */}
      {openBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpenBankModal(false)}
          />
          <div className="relative z-10 w-[95%] max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Bank Settings</h3>
              <button
                onClick={() => setOpenBankModal(false)}
                className="rounded-full p-2 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {[
                "accountHolder",
                "accountNumber",
                "ifsc",
                "bankName",
                "branch",
                "upi",
              ].map((f: any) => (
                <div key={f}>
                  <label className="block text-sm capitalize">{f}</label>
                  <input
                    className="border rounded-lg w-full p-2"
                    value={
                      (bankDraft as any)[f] ||
                      (profile?.bank || ({} as any))[f] ||
                      ""
                    }
                    onChange={(e) =>
                      setBankDraft({ ...bankDraft, [f]: e.target.value })
                    }
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-3">
                <button
                  onClick={() => setOpenBankModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={saveBank}
                  disabled={busy}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  {busy ? "Save..." : "Save Bank"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settlement Modal */}
      {openSettlementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpenSettlementModal(false)}
          />
          <div className="relative z-10 w-[95%] max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Request Settlement</h3>
              <button
                onClick={() => setOpenSettlementModal(false)}
                className="rounded-full p-2 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-sm">
                Booking IDs (comma separated)
              </label>
              <input
                className="border rounded-lg w-full p-2"
                placeholder="booking1, booking2"
                onChange={(e) =>
                  setEligibleBookings(
                    e.target.value
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean)
                  )
                }
              />
              <label className="block text-sm">Total Amount</label>
              <input
                type="number"
                className="border rounded-lg w-full p-2"
                onChange={(e) =>
                  setSettlementAmount(Number(e.target.value) || 0)
                }
              />
              <div className="flex justify-end gap-2 pt-3">
                <button
                  onClick={() => setOpenSettlementModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSettlementRequest}
                  disabled={busy}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg"
                >
                  {busy ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
