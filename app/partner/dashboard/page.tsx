// app/partner/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";

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

/* ------------------------------------------------------------------
   Embedded Modal (lightweight, focus-trap-ish, ESC to close)
-------------------------------------------------------------------*/
function Modal({
  isOpen,
  title,
  onClose,
  children,
}: {
  isOpen: boolean;
  title?: string;
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
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-[95%] max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Types
-------------------------------------------------------------------*/
type PartnerProfile = {
  uid: string;
  role?: "partner" | string;
  name?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  profilePic?: string;
  status?: "pending" | "approved" | "rejected";
  kyc?: { status?: string };
  bank?: {
    accountHolder?: string;
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
    branch?: string;
    upi?: string;
  };
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
};

type Booking = {
  id: string;
  amount?: number;
  date?: string; // ISO date string for chart (we’ll handle gracefully)
  createdAt?: any;
};

/* ------------------------------------------------------------------
   Page
-------------------------------------------------------------------*/
export default function PartnerDashboard() {
  const router = useRouter();

  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({
    listings: 0,
    bookings: 0,
    earnings: 0,
    reviews: 0,
  });

  // Chart
  const [chartData, setChartData] = useState<{ date: string; count: number }[]>(
    []
  );

  // Recent bookings
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);

  // Modals
  const [openBusinessModal, setOpenBusinessModal] = useState(false);
  const [openBankModal, setOpenBankModal] = useState(false);

  // Editable state (Bank)
  const [bankDraft, setBankDraft] = useState<NonNullable<PartnerProfile["bank"]>>(
    {}
  );
  // Editable state (Business)
  const [bizDraft, setBizDraft] = useState<{
    businessName?: string;
    phone?: string;
    address?: PartnerProfile["address"];
  }>({});

  /* -------------------- Auth & Partner Profile -------------------- */
  useEffect(() => {
    let unsubListings: any = null;
    let unsubBookings: any = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }

      try {
        // Load /partners/{uid}
        const partnerRef = doc(db, "partners", user.uid);
        const partnerSnap = await getDoc(partnerRef);
        if (!partnerSnap.exists()) {
          // Auto-create a minimal partner doc if missing
          const base: PartnerProfile = {
            uid: user.uid,
            role: "partner",
            name: user.displayName || "",
            email: user.email || "",
            status: "pending",
            bank: {},
            address: {},
          };
          await setDoc(partnerRef, { ...base, createdAt: serverTimestamp() }, { merge: true });
          setProfile(base);
        } else {
          const data = { uid: user.uid, ...partnerSnap.data() } as PartnerProfile;
          if (data.role !== "partner") {
            alert("❌ Not authorized as partner.");
            router.push("/");
            return;
          }
          setProfile(data);
        }

        // === LISTINGS COUNT ===
        unsubListings = onSnapshot(
          query(collection(db, "listings"), where("createdBy", "==", user.uid)),
          (snap) => setStats((prev) => ({ ...prev, listings: snap.size })),
          (err) => console.error("Listings snapshot error:", err)
        );

        // === BOOKINGS, EARNINGS, CHART, RECENT ===
        const baseBookingsQuery = query(
          collection(db, "bookings"),
          where("partnerId", "==", user.uid)
        );

        // Try with orderBy if field exists
        try {
          const q = query(baseBookingsQuery, orderBy("createdAt", "desc"));
          unsubBookings = onSnapshot(
            q,
            (snap) => handleBookingsSnapshot(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
            (err) => {
              console.error("Bookings snapshot error:", err);
              setLoading(false);
            }
          );
        } catch {
          // Fallback without orderBy
          unsubBookings = onSnapshot(
            baseBookingsQuery,
            (snap) =>
              handleBookingsSnapshot(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
            (err) => {
              console.error("Bookings snapshot error (fallback):", err);
              setLoading(false);
            }
          );
        }
      } catch (err) {
        console.error("PartnerDashboard init error:", err);
      } finally {
        setLoading(false);
      }
    });

    function handleBookingsSnapshot(items: any[]) {
      const bookings: Booking[] = items.map((b) => ({
        id: b.id,
        amount: Number(b.amount) || 0,
        date: b.date || (b.createdAt?.toDate ? b.createdAt.toDate().toISOString() : undefined),
        createdAt: b.createdAt,
      }));

      // bookings count & earnings
      const total = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);
      setStats((prev) => ({
        ...prev,
        bookings: bookings.length,
        earnings: total,
      }));

      // chart (last 7 days by yyyy-mm-dd)
      const today = new Date();
      const last7 = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(today.getDate() - i);
        return { date: d.toISOString().slice(0, 10), count: 0 };
      });

      bookings.forEach((b) => {
        const key = (b.date || "").slice(0, 10);
        const row = last7.find((x) => x.date === key);
        if (row) row.count += 1;
      });

      setChartData(last7.reverse());

      // recent (top 5 by createdAt desc-ish)
      const recent = [...bookings]
        .sort((a, b) => {
          const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return tb - ta;
        })
        .slice(0, 5);
      setRecentBookings(recent);
    }

    return () => {
      unsubListings && unsubListings();
      unsubBookings && unsubBookings();
      unsubAuth();
    };
  }, [router]);

  /* -------------------- Drafts from profile -------------------- */
  useEffect(() => {
    if (!profile) return;
    setBankDraft(profile.bank || {});
    setBizDraft({
      businessName: profile.businessName || "",
      phone: profile.phone || "",
      address: {
        line1: profile.address?.line1 || "",
        city: profile.address?.city || "",
        state: profile.address?.state || "",
        pincode: profile.address?.pincode || "",
      },
    });
  }, [profile]);

  /* -------------------- Actions: Save Business -------------------- */
  const saveBusiness = async () => {
    if (!profile?.uid) return;
    const pRef = doc(db, "partners", profile.uid);
    await updateDoc(pRef, {
      businessName: bizDraft.businessName || "",
      phone: bizDraft.phone || "",
      address: {
        line1: bizDraft.address?.line1 || "",
        city: bizDraft.address?.city || "",
        state: bizDraft.address?.state || "",
        pincode: bizDraft.address?.pincode || "",
      },
      updatedAt: serverTimestamp(),
    });
    setOpenBusinessModal(false);
  };

  /* -------------------- Actions: Save Bank -------------------- */
  const saveBank = async () => {
    if (!profile?.uid) return;

    // Basic client validation
    const acc = (bankDraft.accountNumber || "").trim();
    const ifsc = (bankDraft.ifsc || "").trim().toUpperCase();
    if (acc.length < 8) {
      alert("Account number looks invalid.");
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      alert("IFSC looks invalid (e.g., HDFC0001234).");
      return;
    }

    const pRef = doc(db, "partners", profile.uid);
    await updateDoc(pRef, {
      bank: {
        accountHolder: (bankDraft.accountHolder || "").trim(),
        accountNumber: acc,
        ifsc,
        bankName: (bankDraft.bankName || "").trim(),
        branch: (bankDraft.branch || "").trim(),
        upi: (bankDraft.upi || "").trim(),
      },
      updatedAt: serverTimestamp(),
    });
    setOpenBankModal(false);
  };

  /* -------------------- Derived UI -------------------- */
  const welcomeName = useMemo(
    () => profile?.businessName || profile?.name || "Partner",
    [profile]
  );

  if (loading || !profile)
    return <p className="py-12 text-center text-gray-600">Loading dashboard…</p>;

  return (
    <DashboardLayout
      title="Partner Dashboard"
      profile={{
        name: welcomeName,
        role: "partner",
        profilePic: profile?.profilePic,
      }}
    >
      {/* Header Card */}
      <div className="mb-8 rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Hello, {welcomeName} 👋
            </h1>
            <p className="text-gray-600">
              Manage your listings, view earnings, and update your business & bank details.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setOpenBusinessModal(true)}
              className="rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-black"
            >
              Business Settings
            </button>
            <button
              onClick={() => setOpenBankModal(true)}
              className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Bank Settings
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Listings", value: stats.listings },
          { label: "Bookings", value: stats.bookings },
          {
            label: "Earnings",
            value:
              typeof stats.earnings === "number"
                ? `₹${(stats.earnings as number).toLocaleString()}`
                : "₹0",
          },
          { label: "Reviews", value: stats.reviews },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl bg-white p-6 text-center shadow">
            <h2 className="text-2xl font-bold">{card.value}</h2>
            <p className="text-gray-600">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Analytics */}
      <div className="mb-12 rounded-2xl bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold">Bookings (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Bookings */}
      <div className="mb-12 rounded-2xl bg-white p-6 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Bookings</h3>
          <a href="/partner/bookings" className="text-sm text-blue-600 hover:underline">
            View all
          </a>
        </div>
        {recentBookings.length ? (
          <ul className="divide-y">
            {recentBookings.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-3">
                <div className="text-sm text-gray-800">#{b.id.slice(0, 8)}</div>
                <div className="text-sm text-gray-500">
                  {b.createdAt?.toDate
                    ? b.createdAt.toDate().toLocaleString()
                    : b.date
                    ? new Date(b.date).toLocaleString()
                    : "--"}
                </div>
                <div className="text-sm font-medium text-gray-900">
                  ₹{(b.amount || 0).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No recent bookings.</p>
        )}
      </div>

      {/* Listings Manager */}
      <section className="mb-12 rounded-2xl bg-white p-6 shadow">
        <h3 className="mb-4 text-xl font-semibold">Manage Your Listings</h3>
        <PartnerListingsManager />
      </section>

      {/* Payouts placeholder */}
      <section className="mb-24 rounded-2xl bg-white p-6 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xl font-semibold">Payouts & Settlements</h3>
          <a href="/partner/settlements" className="text-sm text-blue-600 hover:underline">
            View all
          </a>
        </div>
        <p className="text-gray-600">
          Your payout history will appear here once settlements are generated.
          <br />
          <span className="text-sm text-gray-500">
            (Next step: add `/app/api/settlements/*` and a `/partner/settlements` page.)
          </span>
        </p>
      </section>

      {/* Business Settings Modal */}
      <Modal
        isOpen={openBusinessModal}
        title="Business Settings"
        onClose={() => setOpenBusinessModal(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700">Business Name</label>
            <input
              className="mt-1 w-full rounded-lg border p-2"
              value={bizDraft.businessName || ""}
              onChange={(e) =>
                setBizDraft((s) => ({ ...s, businessName: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Phone</label>
            <input
              className="mt-1 w-full rounded-lg border p-2"
              value={bizDraft.phone || ""}
              onChange={(e) => setBizDraft((s) => ({ ...s, phone: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-700">Address Line</label>
              <input
                className="mt-1 w-full rounded-lg border p-2"
                value={bizDraft.address?.line1 || ""}
                onChange={(e) =>
                  setBizDraft((s) => ({
                    ...s,
                    address: { ...s.address, line1: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">City</label>
              <input
                className="mt-1 w-full rounded-lg border p-2"
                value={bizDraft.address?.city || ""}
                onChange={(e) =>
                  setBizDraft((s) => ({
                    ...s,
                    address: { ...s.address, city: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">State</label>
              <input
                className="mt-1 w-full rounded-lg border p-2"
                value={bizDraft.address?.state || ""}
                onChange={(e) =>
                  setBizDraft((s) => ({
                    ...s,
                    address: { ...s.address, state: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">PIN Code</label>
              <input
                className="mt-1 w-full rounded-lg border p-2"
                value={bizDraft.address?.pincode || ""}
                onChange={(e) =>
                  setBizDraft((s) => ({
                    ...s,
                    address: { ...s.address, pincode: e.target.value },
                  }))
                }
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => setOpenBusinessModal(false)}
              className="rounded-lg bg-gray-100 px-4 py-2 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={saveBusiness}
              className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-black"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>

      {/* Bank Settings Modal */}
      <Modal
        isOpen={openBankModal}
        title="Bank Account Settings"
        onClose={() => setOpenBankModal(false)}
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-700">Account Holder</label>
              <input
                className="mt-1 w-full rounded-lg border p-2"
                value={bankDraft.accountHolder || ""}
                onChange={(e) =>
                  setBankDraft((s) => ({ ...s, accountHolder: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Account Number</label>
              <input
                className="mt-1 w-full rounded-lg border p-2"
                value={bankDraft.accountNumber || ""}
                onChange={(e) =>
                  setBankDraft((s) => ({ ...s, accountNumber: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">IFSC</label>
              <input
                className="mt-1 w-full rounded-lg border p-2 uppercase"
                value={bankDraft.ifsc || ""}
                onChange={(e) => setBankDraft((s) => ({ ...s, ifsc: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Bank Name</label>
              <input
                className="mt-1 w-full rounded-lg border p-2"
                value={bankDraft.bankName || ""}
                onChange={(e) =>
                  setBankDraft((s) => ({ ...s, bankName: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Branch</label>
              <input
                className="mt-1 w-full rounded-lg border p-2"
                value={bankDraft.branch || ""}
                onChange={(e) => setBankDraft((s) => ({ ...s, branch: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">UPI (optional)</label>
              <input
                className="mt-1 w-full rounded-lg border p-2"
                placeholder="name@bank"
                value={bankDraft.upi || ""}
                onChange={(e) => setBankDraft((s) => ({ ...s, upi: e.target.value }))}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => setOpenBankModal(false)}
              className="rounded-lg bg-gray-100 px-4 py-2 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={saveBank}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Save Bank
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
