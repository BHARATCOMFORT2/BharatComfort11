"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getFirebaseIdToken } from "@/lib/firebase-auth";

interface Refund {
  id: string;
  bookingId: string;
  userId: string;
  partnerId?: string;
  amount: number;
  paymentMode: string;
  refundStatus: string;
  createdAt?: { seconds: number };
}

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

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
      if (data.success) setRefunds(data.refunds || []);
      else toast.error(data.error || "Failed to fetch refunds");
    } catch (error) {
      console.error("Refunds fetch error:", error);
      toast.error("Unable to load refunds");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (refundId: string, action: "approve" | "reject") => {
    if (!confirm(`Are you sure you want to ${action} this refund?`)) return;

    try {
      setProcessingId(refundId);
      const token = await getFirebaseIdToken();
      const res = await fetch("/api/refunds/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ refundId, action }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          action === "approve"
            ? "Refund approved successfully"
            : "Refund rejected"
        );
        fetchRefunds();
      } else {
        toast.error(data.error || "Action failed");
      }
    } catch (error) {
      console.error("Refund action error:", error);
      toast.error("Error performing refund action");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <p className="p-6 text-center text-gray-500">Loading refunds...</p>;
  }

  if (refunds.length === 0) {
    return <p className="p-6 text-center text-gray-500">No refunds found.</p>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Refund Requests</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Refund ID</th>
              <th className="p-3 text-left">Booking</th>
              <th className="p-3 text-left">User</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Payment Mode</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {refunds.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.id}</td>
                <td className="p-3">{r.bookingId}</td>
                <td className="p-3">{r.userId}</td>
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
                <td className="p-3 text-center">
                  {r.refundStatus === "pending" ? (
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        onClick={() => handleAction(r.id, "approve")}
                        disabled={processingId === r.id}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleAction(r.id, "reject")}
                        disabled={processingId === r.id}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">No actions</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
