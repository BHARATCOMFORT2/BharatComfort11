"use client";

import { useEffect, useState } from "react";
import { getFirebaseIdToken } from "@/lib/firebase-auth";
import { toast } from "sonner";

interface Refund {
  id: string;
  bookingId: string;
  amount: number;
  paymentMode: string;
  refundStatus: string;
  createdAt?: { seconds: number };
  processedAt?: { seconds: number };
}

export default function UserRefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const token = await getFirebaseIdToken();
      const res = await fetch("/api/refunds", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setRefunds(data.refunds || []);
      } else {
        toast.error(data.error || "Failed to load refunds");
      }
    } catch (error) {
      console.error("Refund fetch error:", error);
      toast.error("Error loading refund data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p className="p-6 text-center text-gray-500">Loading refunds...</p>;
  }

  if (refunds.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>You have no refunds yet.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">My Refunds</h1>

      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-700 font-medium">
            <tr>
              <th className="p-3 text-left">Refund ID</th>
              <th className="p-3 text-left">Booking</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Mode</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Processed At</th>
            </tr>
          </thead>
          <tbody>
            {refunds.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 text-blue-600 font-medium">{r.id}</td>
                <td className="p-3">{r.bookingId}</td>
                <td className="p-3 font-semibold">₹{r.amount}</td>
                <td className="p-3 capitalize">{r.paymentMode}</td>
                <td className="p-3">
                  <span
                    className={`font-semibold ${
                      r.refundStatus === "processed"
                        ? "text-green-600"
                        : r.refundStatus === "pending"
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {r.refundStatus}
                  </span>
                </td>
                <td className="p-3 text-gray-500">
                  {r.processedAt
                    ? new Date(r.processedAt.seconds * 1000).toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
