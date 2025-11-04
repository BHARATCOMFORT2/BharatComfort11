"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { getAuth } from "firebase/auth";
import { toast } from "sonner";

/**
 * 🔹 Admin Refund Center
 * Lists all refunds, allows approving/marking processed, re-sending invoices, etc.
 */
export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);

  useEffect(() => {
    fetchRefunds();
  }, []);

  const getFirebaseToken = async () => {
    const user = getAuth().currentUser;
    if (!user) throw new Error("Not logged in");
    return await user.getIdToken();
  };

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const token = await getFirebaseToken();
      const res = await fetch("/api/refunds", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRefunds(data.refunds || []);
      } else {
        toast.error(data.error || "Failed to fetch refunds");
      }
    } catch (e) {
      console.error("Refund fetch error:", e);
      toast.error("Error loading refunds");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (refundId: string, newStatus: string) => {
    try {
      setUpdating(refundId);
      const token = await getFirebaseToken();
      const res = await fetch("/api/refunds/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ refundId, newStatus }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Refund marked as ${newStatus}`);
        fetchRefunds();
      } else {
        toast.error(data.error || "Failed to update refund");
      }
    } catch (e) {
      console.error("Status update error:", e);
      toast.error("Error updating refund status");
    } finally {
      setUpdating(null);
    }
  };

  const handleResendInvoice = async (refundId: string) => {
    try {
      setResending(refundId);
      const token = await getFirebaseToken();
      const res = await fetch("/api/invoices/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: "refund", id: refundId }),
      });
      const data = await res.json();
      if (data.success) toast.success("Refund invoice re-sent!");
      else toast.error(data.error || "Failed to re-send");
    } catch (e) {
      console.error("Resend invoice error:", e);
      toast.error("Error re-sending invoice");
    } finally {
      setResending(null);
    }
  };

  const filtered = refunds.filter((r) => {
    const matchesStatus =
      filterStatus === "all" || r.refundStatus === filterStatus;
    const matchesSearch =
      r.bookingId?.toLowerCase().includes(search.toLowerCase()) ||
      r.id?.toLowerCase().includes(search.toLowerCase()) ||
      r.userEmail?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Refund Management</h1>

        <div className="flex items-center gap-3">
          <Input
            placeholder="Search by refund, booking, or email"
            className="max-w-md"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="border rounded-md p-2"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="processed">Processed</option>
          </select>

          <Button onClick={fetchRefunds} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      <Card className="shadow-sm overflow-x-auto">
        <CardContent className="p-4">
          {loading ? (
            <p>Loading refunds...</p>
          ) : filtered.length === 0 ? (
            <p className="text-gray-500">No refunds found.</p>
          ) : (
            <table className="min-w-full border text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="p-3 text-left">Refund ID</th>
                  <th className="p-3 text-left">Booking ID</th>
                  <th className="p-3 text-left">User</th>
                  <th className="p-3 text-left">Amount</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Invoice</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b hover:bg-gray-50 transition-all"
                  >
                    <td className="p-3 font-medium text-blue-600">{r.id}</td>
                    <td className="p-3">{r.bookingId}</td>
                    <td className="p-3">
                      {r.userEmail || r.userId || "-"}
                    </td>
                    <td className="p-3 font-semibold">₹{r.amount}</td>

                    <td className="p-3">
                      <span
                        className={`font-semibold capitalize ${
                          r.refundStatus === "processed"
                            ? "text-green-600"
                            : r.refundStatus === "approved"
                            ? "text-blue-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {r.refundStatus}
                      </span>
                    </td>

                    <td className="p-3">
                      {r.invoiceUrl ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            window.open(r.invoiceUrl, "_blank")
                          }
                        >
                          View Invoice
                        </Button>
                      ) : (
                        <span className="text-gray-500 text-sm">Pending</span>
                      )}
                    </td>

                    <td className="p-3 flex gap-2">
                      {r.refundStatus === "pending" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleStatusUpdate(r.id, "approved")
                          }
                          disabled={updating === r.id}
                        >
                          {updating === r.id
                            ? "Updating..."
                            : "Approve Refund"}
                        </Button>
                      )}

                      {r.refundStatus === "approved" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            handleStatusUpdate(r.id, "processed")
                          }
                          disabled={updating === r.id}
                        >
                          {updating === r.id
                            ? "Updating..."
                            : "Mark Processed"}
                        </Button>
                      )}

                      {r.invoiceUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={resending === r.id}
                          onClick={() => handleResendInvoice(r.id)}
                        >
                          {resending === r.id
                            ? "Sending..."
                            : "Re-send Email"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
