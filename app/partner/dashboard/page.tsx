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

/* -------------------- Local Modal -------------------- */
function Modal({ isOpen, title, onClose, children }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && onClose();
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
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
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

/* -------------------- Page -------------------- */
export default function PartnerDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string>("");

  // stats + chart
  const [stats, setStats] = useState({ listings: 0, bookings: 0, earnings: 0 });
  const [chartData, setChartData] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);

  // modals
  const [openBusinessModal, setOpenBusinessModal] = useState(false);
  const [openBankModal, setOpenBankModal] = useState(false);
  const [openSettlementModal, setOpenSettlementModal] = useState(false);

  const [bankDraft, setBankDraft] = useState({});
  const [bizDraft, setBizDraft] = useState({});
  const [eligibleBookings, setEligibleBookings] = useState<string[]>([]);
  const [settlementAmount, setSettlementAmount] = useState<number>(0);

  /* -------------------- Auth + Firestore -------------------- */
  useEffect(() => {
    let unsubAuth: any, unsubListings: any, unsubBookings: any;

    unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }
      const t = await user.getIdToken();
      setToken(t);

      // partner doc
      const ref = doc(db, "partners", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          uid: user.uid,
          role: "partner",
          email: user.email,
          status: "pending",
          createdAt: serverTimestamp(),
        });
      }
      setProfile({ uid: user.uid, ...(snap.data() as any) });

      // listings
      unsubListings = onSnapshot(
        query(collection(db, "listings"), where("createdBy", "==", user.uid)),
        (s) => setStats((p) => ({ ...p, listings: s.size }))
      );

      // bookings
      const q = query(
        collection(db, "bookings"),
        where("partnerId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      unsubBookings = onSnapshot(q, (s) => {
        const list = s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        const total = list.reduce((a, b) => a + (Number(b.amount) || 0), 0);
        setStats((p) => ({ ...p, bookings: list.length, earnings: total }));
        setRecentBookings(list.slice(0, 5));
      });
      setLoading(false);
    });
    return () => {
      unsubListings && unsubListings();
      unsubBookings && unsubBookings();
      unsubAuth && unsubAuth();
    };
  }, [router]);

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

  /* -------------------- Settlement APIs -------------------- */
  const handleSettlementRequest = async () => {
    if (!eligibleBookings.length || settlementAmount <= 0) {
      alert("Select bookings and enter amount");
      return;
    }
    const res = await fetch("/api/settlements/request", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
  const welcome = useMemo(() => profile?.businessName || profile?.name || "Partner", [profile]);

  if (loading) return <p className="text-center py-10">Loading dashboard...</p>;

  return (
    <DashboardLayout
      title="Partner Dashboard"
      profile={{ name: welcome, role: "partner", profilePic: profile?.profilePic }}
    >
      {/* Greeting */}
      <div className="mb-6 bg-white rounded-2xl p-6 shadow">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Hello, {welcome} 👋</h1>
            <p className="text-gray-600">Manage your listings, bookings & payouts.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setOpenBusinessModal(true)} className="px-4 py-2 bg-gray-900 text-white rounded-lg">
              Business Settings
            </button>
            <button onClick={() => setOpenBankModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Bank Settings
            </button>
            <button onClick={() => setOpenSettlementModal(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg">
              Request Settlement
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-6 mb-8">
        {[
          { label: "Listings", value: stats.listings },
          { label: "Bookings", value: stats.bookings },
          { label: "Earnings", value: `₹${stats.earnings.toLocaleString()}` },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl p-6 text-center shadow">
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

      {/* Settlements Placeholder */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h3 className="text-xl font-semibold mb-2">Payouts & Settlements</h3>
        <p className="text-gray-600">
          Track settlements once they are approved by admin.
        </p>
      </div>

      {/* Modals */}
      <Modal isOpen={openBusinessModal} title="Business Settings" onClose={() => setOpenBusinessModal(false)}>
        <div className="space-y-4">
          <label className="block text-sm">Business Name</label>
          <input
            className="border rounded-lg w-full p-2"
            value={bizDraft.businessName || ""}
            onChange={(e) => setBizDraft({ ...bizDraft, businessName: e.target.value })}
          />
          <label className="block text-sm">Phone</label>
          <input
            className="border rounded-lg w-full p-2"
            value={bizDraft.phone || ""}
            onChange={(e) => setBizDraft({ ...bizDraft, phone: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setOpenBusinessModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">
              Cancel
            </button>
            <button onClick={saveBusiness} className="px-4 py-2 bg-gray-900 text-white rounded-lg">
              Save
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={openBankModal} title="Bank Settings" onClose={() => setOpenBankModal(false)}>
        <div className="space-y-3">
          {["accountHolder", "accountNumber", "ifsc", "bankName", "branch", "upi"].map((f) => (
            <div key={f}>
              <label className="block text-sm capitalize">{f}</label>
              <input
                className="border rounded-lg w-full p-2"
                value={bankDraft[f] || ""}
                onChange={(e) => setBankDraft({ ...bankDraft, [f]: e.target.value })}
              />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-3">
            <button onClick={() => setOpenBankModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">
              Cancel
            </button>
            <button onClick={saveBank} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Save Bank
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={openSettlementModal} title="Request Settlement" onClose={() => setOpenSettlementModal(false)}>
        <div className="space-y-3">
          <label className="block text-sm">Booking IDs (comma separated)</label>
          <input
            className="border rounded-lg w-full p-2"
            placeholder="booking1, booking2"
            onChange={(e) => setEligibleBookings(e.target.value.split(",").map((x) => x.trim()))}
          />
          <label className="block text-sm">Total Amount</label>
          <input
            type="number"
            className="border rounded-lg w-full p-2"
            onChange={(e) => setSettlementAmount(Number(e.target.value))}
          />
          <div className="flex justify-end gap-2 pt-3">
            <button onClick={() => setOpenSettlementModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">
              Cancel
            </button>
            <button onClick={handleSettlementRequest} className="px-4 py-2 bg-green-600 text-white rounded-lg">
              Submit Request
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
