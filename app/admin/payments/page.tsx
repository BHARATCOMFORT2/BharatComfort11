"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    try {
      const q = query(collection(db, "payments"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setPayments(list);
    } catch (err) {
      console.error("Error fetching payments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push("/auth/login");
      return;
    }
    // TODO: enforce superadmin role check
    fetchPayments();
  }, [router]);

  if (loading) return <p className="text-center py-12">Loading payments...</p>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Payments</h1>

      {payments.length > 0 ? (
        <table className="w-full border-collapse border rounded-lg overflow-hidden shadow">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2 text-left">Date</th>
              <th className="border px-4 py-2 text-left">User</th>
              <th className="border px-4 py-2 text-left">Partner</th>
              <th className="border px-4 py-2 text-left">Amount</th>
              <th className="border px-4 py-2 text-left">Method</th>
              <th className="border px-4 py-2 text-left">Type</th>
              <th className="border px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((pay) => (
              <tr key={pay.id} className="bg-white hover:bg-gray-50">
                <td className="border px-4 py-2 text-sm">
                  {pay.createdAt?.toDate
                    ? new Date(pay.createdAt.toDate()).toLocaleString()
                    : "—"}
                </td>
                <td className="border px-4 py-2">{pay.userId || "—"}</td>
                <td className="border px-4 py-2">{pay.partnerId || "—"}</td>
                <td className="border px-4 py-2">
                  {pay.amount} {pay.currency}
                </td>
                <td className="border px-4 py-2">{pay.method}</td>
                <td className="border px-4 py-2">{pay.type}</td>
                <td
                  className={`border px-4 py-2 font-semibold ${
                    pay.status === "success"
                      ? "text-green-600"
                      : pay.status === "pending"
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {pay.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-500">No payments found.</p>
      )}
    </div>
  );
}
