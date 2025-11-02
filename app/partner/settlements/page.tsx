"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function PartnerSettlementsPage() {
  const router = useRouter();
  const [partner, setPartner] = useState<any>(null);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ✅ Auth + Settlements
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (!user) return router.push("/auth/login");
      setPartner(user);

      const q = query(
        collection(db, "settlements"),
        where("partnerId", "==", user.uid),
        orderBy("requestedAt", "desc")
      );

      const unsubSet = onSnapshot(q, (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setSettlements(data);
        setLoading(false);
      });

      return () => unsubSet();
    });
    return () => unsub();
  }, [router]);

  // ✅ Request new settlement
  const handleRequestSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) {
      alert("Enter a valid amount.");
      return;
    }

    setSubmitting(true);
    try {
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      await addDoc(collection(db, "settlements"), {
        partnerId: partner.uid,
        amount: Number(amount),
        status: "requested",
        requestedAt: serverTimestamp(),
        expiresAt,
      });
      setAmount("");
      alert("✅ Settlement request submitted. Admin will review within 48 hours.");
    } catch (err) {
      console.error("Settlement request failed:", err);
      alert("Failed to request settlement. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return <p className="text-center py-12 text-gray-600">Loading settlements...</p>;

  return (
    <DashboardLayout
      title="Payouts & Settlements"
      profile={{ name: "Partner", role: "partner" }}
    >
      <div className="bg-white p-6 rounded-2xl shadow mb-8">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">Request Settlement</h1>

        <form onSubmit={handleRequestSettlement} className="flex flex-col sm:flex-row gap-3">
          <input
            type="number"
            min="1"
            placeholder="Enter Amount (₹)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border rounded-lg p-3 flex-1"
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            {submitting ? "Submitting..." : "Request Settlement"}
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Settlement History</h2>

        {settlements.length === 0 ? (
          <p className="text-gray-600">
            No settlements yet. You can request a payout anytime.
          </p>
        ) : (
          <table className="w-full border rounded-lg text-sm overflow-hidden">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Expires</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => (
                <tr key={s.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    {s.requestedAt?.toDate
                      ? s.requestedAt.toDate().toLocaleString()
                      : "—"}
                  </td>
                  <td className="p-3 font-semibold text-gray-800">
                    ₹{s.amount.toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        s.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : s.status === "requested"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500">
                    {s.expiresAt
                      ? new Date(s.expiresAt.seconds * 1000).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
}
