"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useRouter } from "next/navigation";

interface Payment {
  id: string;
  listingId: string;
  amount: number;
  status: string;
  createdAt: any;
}

export default function PaymentHistoryPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push("/auth/login");
        return;
      }

      try {
        const q = query(
          collection(db, "payments"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);

        const data: Payment[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Payment),
        }));
        setPayments(data);
      } catch (err) {
        console.error("Error fetching payments:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [router]);

  if (loading) return <p className="text-center py-12">Loading payment history...</p>;

  if (payments.length === 0) {
    return <p className="text-center py-12">No payments found.</p>;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">My Payment History</h1>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="border p-3">Listing</th>
              <th className="border p-3">Amount</th>
              <th className="border p-3">Status</th>
              <th className="border p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td className="border p-3">{payment.listingId}</td>
                <td className="border p-3">₹{payment.amount.toLocaleString("en-IN")}</td>
                <td
                  className={`border p-3 font-semibold ${
                    payment.status === "success"
                      ? "text-green-600"
                      : payment.status === "pending"
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {payment.status}
                </td>
                <td className="border p-3">
                  {payment.createdAt?.toDate
                    ? payment.createdAt.toDate().toLocaleString()
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
