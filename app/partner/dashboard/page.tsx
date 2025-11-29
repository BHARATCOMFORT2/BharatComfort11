"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase-client";
import { onAuthStateChanged } from "firebase/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PartnerListingsManager from "@/components/dashboard/PartnerListingsManager";
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
  kycStatus?: string; // normalized field
  kyc?: { status?: string };
  bank?: any;
  address?: Record<string, string>;
};

export default function PartnerDashboard() {
  const router = useRouter();

  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string>("");

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

  // helper to normalize KYC value for UI comparison
  const normalizeKyc = (raw?: string | null) =>
    (raw || "NOT_STARTED").toString().toUpperCase();

  useEffect(() => {
    let mounted = true;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // keep token available for endpoints that may require idToken
      const t = await user.getIdToken(true);
      if (!mounted) return;
      setToken(t);
      setLoading(true);

      try {
        // 1) profile — use cookie-based session (credentials: include)
        const pRes = await fetch("/api/partners/profile", {
          credentials: "include",
        });
        const pJson = await pRes.json().catch(() => null);

        // CASE: partner doc not created yet
        if (!pJson || pJson.ok === false) {
          if (pJson?.exists === false) {
            // do NOT redirect — show KYC UI inside dashboard instead
            setProfile({
              uid: pJson?.uid || user.uid,
              displayName: user.displayName || undefined,
              businessName: null,
              email: user.email || undefined,
              phone: user.phoneNumber || undefined,
              profilePic: null,
              status: "NOT_CREATED",
              kycStatus: "NOT_STARTED",
              kyc: null,
              bank: null,
              address: null,
            });
          }
        } else {
          const partnerObj = pJson.partner || {};

          // kycStatus might be available at top-level or inside partner
          const rawKyc =
            (pJson.kycStatus as string) ||
            (partnerObj.kycStatus as string) ||
            (partnerObj.kyc?.status as string);
          const kycStatus = normalizeKyc(rawKyc);

          const normalized: PartnerProfile = {
            uid: (pJson.uid as string) || partnerObj.uid || user.uid,
            displayName:
              partnerObj.displayName ||
              partnerObj.name ||
              partnerObj.businessName ||
              user.displayName,
            businessName:
              partnerObj.businessName ||
              partnerObj.displayName ||
              partnerObj.name ||
              null,
            email: partnerObj.email || user.email || null,
            phone: partnerObj.phone || user.phoneNumber || null,
            profilePic: partnerObj.profilePic || null,
            status: (partnerObj.status || pJson.onboardingStatus || null) as any,
            kycStatus,
            kyc: partnerObj.kyc || null,
            bank: partnerObj.bank || null,
            address: partnerObj.address || null,
          };

          setProfile(normalized);

          // IMPORTANT: Do not redirect — only show the KYC card if not approved
          // previous redirect logic removed intentionally
        }

        // 2) bookings (first page) — use cookies for session
        const bookingsRes = await fetch("/api/partners/bookings?limit=10", {
          credentials: "include",
        });
        const bookingsJson = await bookingsRes.json().catch(() => null);
        if (bookingsJson?.ok) {
          setBookings(bookingsJson.bookings || []);
          setHasMore((bookingsJson.bookings?.length || 0) >= 10);
          setStats((s) => ({
            ...s,
            bookings:
              bookingsJson.total ||
              (bookingsJson.bookings || []).length,
            earnings:
              bookingsJson.bookings?.reduce(
                (a: number, b: any) => a + Number(b.amount || 0),
                0
              ) || 0,
          }));
        }

        // 3) finance
        const financeRes = await fetch("/api/partners/finance", {
          credentials: "include",
        });
        const fin = await financeRes.json().catch(() => null);
        if (fin?.ok) {
          setStats((s) => ({
            ...s,
            earnings: fin.totalEarnings ?? s.earnings,
          }));
        }

        // 4) insights (last 7 days)
        const insightsRes = await fetch("/api/partners/insights?days=7", {
          credentials: "include",
        });
        const ins = await insightsRes.json().catch(() => null);
        if (ins?.ok) {
          if (Array.isArray(ins.bookingsPerDay)) {
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
              const label = d.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
              });
              return { date: label, count: 0 };
            });
            setChartData(days);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Dashboard load error", err);
        setLoading(false);
      }
    });

    return () => {
      unsub();
      mounted = false;
    };
  }, [router]);

  const loadMore = async () => {
    if (!token) return;
    setBusy(true);
    try {
      const nextPage = bookingsPage + 1;
      const res = await fetch(
        `/api/partners/bookings?limit=10&page=${nextPage}`,
        {
          credentials: "include",
        }
      );
      const j = await res.json().catch(() => null);
      if (j?.ok) {
        setBookings((prev) => [...prev, ...(j.bookings || [])]);
        setBookingsPage(nextPage);
        setHasMore((j.bookings?.length || 0) >= 10);
      } else {
        alert(j?.error || "Failed to load more");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to load more");
    } finally {
      setBusy(false);
    }
  };

  const refetchProfile = async () => {
    try {
      const p = await fetch("/api/partners/profile", {
        credentials: "include",
      });
      const pj = await p.json().catch(() => null);
      if (pj?.ok && pj.partner) {
        const rawKyc =
          (pj.kycStatus as string) ||
          (pj.partner?.kycStatus as string) ||
          (pj.partner?.kyc?.status as string);
        setProfile((prev) => ({
          ...(prev || {}),
          businessName: pj.partner.businessName || prev?.businessName,
          bank: pj.partner.bank || prev?.bank,
          kycStatus: normalizeKyc(rawKyc),
        } as PartnerProfile));
      }
    } catch (e) {
      console.error("refetchProfile failed", e);
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
      if (res.ok && j?.ok) {
        await refetchProfile();
        setOpenBusinessModal(false);
      } else {
        alert(j?.error || "Failed to save business");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to save business");
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
      if (res.ok && j?.ok) {
        await refetchProfile();
        setOpenBankModal(false);
      } else {
        alert(j?.error || "Failed to save bank");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to save bank");
    } finally {
      setBusy(false);
    }
  };

  const handleSettlementRequest = async () => {
    if (!profile) return;
    const kycStatus = normalizeKyc(
      profile.kycStatus || profile.kyc?.status || ""
    );
    if (kycStatus !== "APPROVED") {
      return alert("KYC must be approved before requesting a settlement.");
    }
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
      } else {
        alert(j?.error || "Failed to request settlement");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to request settlement");
    } finally {
      setBusy(false);
    }
  };

  const welcome = useMemo(
    () => profile?.businessName || profile?.displayName || "Partner",
    [profile]
  );

  if (loading) return <p className="text-center py-10">Loading dashboard…</p>;

  // UI helpers
  const showKycBadge = (s?: string | null) => {
    const st = normalizeKyc(s);
    return st !== "NOT_STARTED";
  };

  const prettyKyc = (s?: string | null) => {
    const st = normalizeKyc(s);
    if (st === "UNDER_REVIEW" || st === "SUBMITTED") return "Pending";
    if (st === "APPROVED") return "Approved";
    if (st === "REJECTED") return "Rejected";
    return "Not started";
  };

  // current normalized kycStatus for UI
  const kycStatus = normalizeKyc(profile?.kycStatus);

  return (
    <DashboardLayout
      title="Partner Dashboard"
      profile={{
        name: welcome,
        role: "partner",
        profilePic: profile?.profilePic,
      }}
    >
      {/* ========== PREMIUM KYC CARD ========== */}
      {kycStatus !== "APPROVED" && (
        <div className="mb-6 bg-yellow-50 border border-yellow-300 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-yellow-800">
            🔐 KYC Verification Required
          </h2>

          {kycStatus === "NOT_STARTED" && (
            <p className="text-yellow-700 mt-1">
              You have not submitted your KYC yet. Please complete your KYC to
              enable full access and settlements.
            </p>
          )}

          {kycStatus === "UNDER_REVIEW" && (
            <p className="text-yellow-700 mt-1">
              Your KYC is under review. Our team will verify it shortly.
            </p>
          )}

          {kycStatus === "REJECTED" && (
            <p className="text-red-700 mt-1">
              Your KYC was rejected. Please resubmit your information.
            </p>
          )}

          <button
            onClick={() => router.push("/partner/dashboard/kyc")}
            className="mt-3 px-4 py-2 bg-yellow-700 text-white rounded-lg hover:bg-yellow-800"
          >
            Complete / View KYC
          </button>
        </div>
      )}

      {/* Greeting */}
      <div className="mb-6 bg-white rounded-2xl p-6 shadow">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Hello, {welcome} 👋</h1>
            <p className="text-gray-600">
              Manage your listings, bookings & payouts.
            </p>

            {showKycBadge(profile?.kycStatus) && (
              <div
                className={`mt-2 inline-block px-3 py-1 text-sm rounded-full ${
                  normalizeKyc(profile?.kycStatus) === "APPROVED"
                    ? "bg-green-100 text-green-700"
                    : normalizeKyc(profile?.kycStatus) === "REJECTED"
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                🧾 KYC {prettyKyc(profile?.kycStatus)}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={() => setOpenBusinessModal(true)}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg"
            >
              Business Settings
            </button>
            <button
              onClick={() => setOpenBankModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Bank Settings
            </button>
            {profile && normalizeKyc(profile?.kycStatus) === "APPROVED" ? (
              <button
                onClick={() => setOpenSettlementModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Request Settlement
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg border border-yellow-300 text-sm">
                ⚠️ KYC {prettyKyc(profile?.kycStatus)} —{" "}
                <button
                  onClick={() => router.push("/partner/dashboard/kyc")}
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  Complete KYC
                </button>
              </div>
            )}
          </div>
        </div>
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

      {/* Recent Bookings + Load More */}
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
                value={
                  bizDraft.businessName || profile?.businessName || ""
                }
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
                      (profile?.bank || {})[f] ||
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
                  )
                }
              />
              <label className="block text-sm">Total Amount</label>
              <input
                type="number"
                className="border rounded-lg w-full p-2"
                onChange={(e) =>
                  setSettlementAmount(Number(e.target.value))
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
