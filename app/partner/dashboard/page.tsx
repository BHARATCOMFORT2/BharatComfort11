"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  setDoc,
  updateDoc,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData,
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

/* -------------------- Modal Component -------------------- */
type ModalProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

function Modal({ isOpen, title, onClose, children }: ModalProps) {
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
      <div className="relative z-10 w-[95%] max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* -------------------- Types -------------------- */
type PartnerProfile = {
  uid: string;
  role?: "partner";
  name?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  profilePic?: string;
  status?: "pending" | "approved" | "rejected";
  kyc?: { status?: string };
  bank?: BankDraft;
  address?: Record<string, string>;
};

type BankDraft = {
  accountHolder?: string;
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
  branch?: string;
  upi?: string;
};

type BizDraft = {
  businessName?: string;
  phone?: string;
  address?: Record<string, string>;
};

/* -------------------- Page -------------------- */
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
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // modals
  const [openBusinessModal, setOpenBusinessModal] = useState(false);
  const [openBankModal, setOpenBankModal] = useState(false);
  const [openSettlementModal, setOpenSettlementModal] = useState(false);

  const [bankDraft, setBankDraft] = useState<BankDraft>({});
  const [bizDraft, setBizDraft] = useState<BizDraft>({});
  const [eligibleBookings, setEligibleBookings] = useState<string[]>([]);
  const [settlementAmount, setSettlementAmount] = useState<number>(0);

  /* -------------------- Auth + Firestore -------------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const t = await user.getIdToken();
      setToken(t);

      const ref = doc(db, "partners", user.uid);
      const snap = await getDoc(ref);

      let partnerData: any;
      if (!snap.exists()) {
        await setDoc(ref, {
          uid: user.uid,
          role: "partner",
          email: user.email,
          status: "pending",
          createdAt: serverTimestamp(),
        });
        const fresh = await getDoc(ref);
        partnerData = fresh.data();
      } else {
        partnerData = snap.data();
      }

      setProfile({
        uid: user.uid,
        ...partnerData,
        kyc: partnerData?.kyc || { status: "pending" },
      });

      // listings count
      const listingsSnap = await getDocs(
        query(
          collection(db, "listings"),
          where("createdBy", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(1)
        )
      );
      setStats((p) => ({ ...p, listings: listingsSnap.size }));

      // first bookings page
      const q = query(
        collection(db, "bookings"),
        where("partnerId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(10)
      );
      const s = await getDocs(q);
      const list = s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      const total = list.reduce((a, b) => a + (Number(b.amount) || 0), 0);

      setStats((p) => ({
        ...p,
        bookings: list.length,
        earnings: total,
      }));
      setBookings(list);
      setLastDoc(s.docs[s.docs.length - 1] || null);
      setHasMore(s.docs.length === 10);
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  /* -------------------- Load More Bookings -------------------- */
  const loadMore = async () => {
    if (!lastDoc || !profile?.uid) return;

    const q = query(
      collection(db, "bookings"),
      where("partnerId", "==", profile.uid),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(10)
    );
    const s = await getDocs(q);
    const more = s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const totalMore = more.reduce((a, b) => a + (Number(b.amount) || 0), 0);

    setStats((p) => ({
      ...p,
      bookings: p.bookings + more.length,
      earnings: p.earnings + totalMore,
    }));
    setBookings((prev) => [...prev, ...more]);
    setLastDoc(s.docs[s.docs.length - 1] || null);
    setHasMore(s.docs.length === 10);
  };

  /* -------------------- Chart Builder -------------------- */
  useEffect(() => {
    const today = new Date();
    const days = [...Array(7)].map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      return {
        key,
        label: d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        }),
        count: 0,
      };
    });

    const index = new Map(days.map((d) => [d.key, d]));
    bookings.forEach((b) => {
      const dt =
        (b.createdAt?.toDate?.() ?? new Date(b.createdAt)) as Date | undefined;
      if (!dt) return;
      const key = dt.toISOString().slice(0, 10);
      if (index.has(key)) index.get(key)!.count += 1;
    });

    setChartData(days.map((d) => ({ date: d.label, count: d.count })));
  }, [bookings]);

  /* -------------------- Save Business / Bank -------------------- */
  const saveBusiness = async () => {
    if (!profile?.uid) return;
    await updateDoc(doc(db, "partners", profile.uid), {
      businessName: bizDraft.businessName || "",
      phone: bizDraft.phone || "",
      address: bizDraft.address || {},
      updatedAt: serverTimestamp(),
    });
    setOpenBusinessModal(false);
  };

  const saveBank = async () => {
    if (!profile?.uid) return;
    await updateDoc(doc(db, "partners", profile.uid), {
      bank: bankDraft,
      updatedAt: serverTimestamp(),
    });
    setOpenBankModal(false);
  };

  /* -------------------- Settlement Request -------------------- */
  const handleSettlementRequest = async () => {
    if (profile?.kyc?.status !== "approved") {
      alert("KYC must be approved before requesting a settlement.");
      return;
    }
    if (!eligibleBookings.length || settlementAmount <= 0) {
      alert("Select bookings and enter amount");
      return;
    }

    const res = await fetch("/api/settlements/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        bookingIds: eligibleBookings,
        totalAmount: settlementAmount,
      }),
    });
    const data = await res.json();

    if (res.ok) {
      alert("✅ Settlement request submitted!");
      setOpenSettlementModal(false);
    } else {
      alert(`❌ ${data.error}`);
    }
  };

  /* -------------------- Derived UI -------------------- */
  const welcome = useMemo(
    () => profile?.businessName || profile?.name || "Partner",
    [profile]
  );

  if (loading) return <p className="text-center py-10">Loading dashboard…</p>;

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
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Hello, {welcome} 👋</h1>
            <p className="text-gray-600">
              Manage your listings, bookings & payouts.
            </p>

            {profile?.kyc?.status && (
              <div
                className={`mt-2 inline-block px-3 py-1 text-sm rounded-full ${
                  profile.kyc.status === "approved"
                    ? "bg-green-100 text-green-700"
                    : profile.kyc.status === "rejected"
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                🧾 KYC{" "}
                {profile.kyc.status.charAt(0).toUpperCase() +
                  profile.kyc.status.slice(1)}
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
            {profile?.kyc?.status === "approved" ? (
              <button
                onClick={() => setOpenSettlementModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Request Settlement
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg border border-yellow-300 text-sm">
                ⚠️ KYC {profile?.kyc?.status || "Pending"} —{" "}
                <button
                  onClick={() => router.push("/partner/kyc")}
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
            <span>{b.id}</span>
            <span className="text-gray-600">₹{b.amount}</span>
          </div>
        ))}
        {hasMore && (
          <div className="text-center mt-3">
            <button
              onClick={loadMore}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg"
            >
              Load more
            </button>
          </div>
        )}
      </div>

      {/* Business Modal */}
      <Modal
        isOpen={openBusinessModal}
        title="Business Settings"
        onClose={() => setOpenBusinessModal(false)}
      >
        <div className="space-y-4">
          <label className="block text-sm">Business Name</label>
          <input
            className="border rounded-lg w-full p-2"
            value={bizDraft.businessName || ""}
            onChange={(e) =>
              setBizDraft({ ...bizDraft, businessName: e.target.value })
            }
          />
          <label className="block text-sm">Phone</label>
          <input
            className="border rounded-lg w-full p-2"
            value={bizDraft.phone || ""}
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
              className="px-4 py-2 bg-gray-900 text-white rounded-lg"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>

      {/* Bank Modal */}
      <Modal
        isOpen={openBankModal}
        title="Bank Settings"
        onClose={() => setOpenBankModal(false)}
      >
        <div className="space-y-3">
          {[
            "accountHolder",
            "accountNumber",
            "ifsc",
            "bankName",
            "branch",
            "upi",
          ].map((f) => (
            <div key={f}>
              <label className="block text-sm capitalize">{f}</label>
              <input
                className="border rounded-lg w-full p-2"
                value={(bankDraft as any)[f] || ""}
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Save Bank
            </button>
          </div>
        </div>
      </Modal>

      {/* Settlement Modal */}
      <Modal
        isOpen={openSettlementModal}
        title="Request Settlement"
        onClose={() => setOpenSettlementModal(false)}
      >
        <div className="space-y-3">
          <label className="block text-sm">Booking IDs (comma separated)</label>
          <input
            className="border rounded-lg w-full p-2"
            placeholder="booking1, booking2"
            onChange={(e) =>
              setEligibleBookings(
                e.target.value.split(",").map((x) => x.trim())
              )
            }
          />
          <label className="block text-sm">Total Amount</label>
          <input
            type="number"
            className="border rounded-lg w-full p-2"
            onChange={(e) => setSettlementAmount(Number(e.target.value))}
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
              className="px-4 py-2 bg-green-600 text-white rounded-lg"
            >
              Submit Request
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
