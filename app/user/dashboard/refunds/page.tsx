"use client";

import { useEffect, useState } from "react";
import { getFirebaseIdToken } from "@/lib/firebase-auth";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

interface Refund {
  id: string;
  bookingId: string;
  amount: number;
  paymentMode: string;
  refundStatus: string;
  invoiceUrl?: string;
  invoiceId?: string;
  createdAt?: { seconds: number };
  processedAt?: { seconds: number };
}

export default function UserRefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);

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

  const handleInvoiceDownload = (url?: string) => {
    if (!url) {
      toast("Invoice not available yet.");
      return;
    }
    window.open(url, "_blank");
  };

  const handleInvoiceResend = async (refundId: string) => {
    try {
      setResending(refundId);
      const token = await getFirebaseIdToken();
      const res = await fetch("/api/invoices/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: "refund", id: refundId }),
      });

      const data = await res.json();
      if (data.success) toast.success("Refund invoice re-sent successfully!");
      else toast.error(data.error || "Failed to re-send invoice");
    } catch (err) {
      console.error("Error re-sending refund invoice:", err);
      toast.error("Error re-sending refund invoice");
    } finally {
      setResending(null);
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
              <th className="p-3 text-left">Processed</th>
              <th className="p-3 text-left">Invoice</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {refunds.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50 transition-all">
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

                {/* Invoice column */}
                <td className="p-3">
                  {r.invoiceUrl ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleInvoiceDownload(r.invoiceUrl)}
                    >
                      View Invoice
                    </Button>
                  ) : (
                    <span className="text-gray-500 text-sm">Pending</span>
                  )}
                </td>

                {/* Actions */}
                <td className="p-3">
                  {r.invoiceUrl ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={resending === r.id}
                      onClick={() => handleInvoiceResend(r.id)}
                    >
                      {resending === r.id ? "Sending..." : "Re-send Email"}
                    </Button>
                  ) : (
                    "-"
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
