"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { getAuth } from "firebase/auth";

/**
 * 🔹 Admin Invoice Center
 * Unified list of all booking + refund invoices.
 */
export default function AdminInvoiceCenterPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const user = getAuth().currentUser;
      if (!user) throw new Error("Not logged in");

      const token = await user.getIdToken();
      const [bookingsRes, refundsRes] = await Promise.all([
        fetch("/api/bookings", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/refunds", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [bookingsData, refundsData] = await Promise.all([
        bookingsRes.json(),
        refundsRes.json(),
      ]);

      const allInvoices: any[] = [];

      if (bookingsData.success) {
        allInvoices.push(
          ...bookingsData.bookings
            .filter((b: any) => b.invoiceUrl)
            .map((b: any) => ({
              id: b.id,
              type: "booking",
              invoiceId: b.invoiceId,
              invoiceUrl: b.invoiceUrl,
              userId: b.userId,
              name: b.userName || "-",
              email: b.userEmail || "-",
              amount: b.amount || 0,
              status: b.status || "paid",
              createdAt: b.createdAt,
              relatedId: b.id,
            }))
        );
      }

      if (refundsData.success) {
        allInvoices.push(
          ...refundsData.refunds
            .filter((r: any) => r.invoiceUrl)
            .map((r: any) => ({
              id: r.id,
              type: "refund",
              invoiceId: r.invoiceId,
              invoiceUrl: r.invoiceUrl,
              userId: r.userId,
              name: r.userName || "-",
              email: r.userEmail || "-",
              amount: r.amount || 0,
              status: r.status || "processed",
              createdAt: r.createdAt,
              relatedId: r.bookingId || "-",
            }))
        );
      }

      const sorted = allInvoices.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );

      setInvoices(sorted);
    } catch (err) {
      console.error("Error loading invoices:", err);
      toast.error("Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (type: string, id: string) => {
    try {
      const user = getAuth().currentUser;
      if (!user) return toast.error("Not logged in");
      const token = await user.getIdToken();

      const res = await fetch("/api/invoices/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, id }),
      });

      const data = await res.json();
      if (data.success) toast.success("Invoice re-sent successfully");
      else toast.error(data.error || "Failed to re-send");
    } catch (err) {
      console.error("Re-send error:", err);
      toast.error("Error re-sending invoice");
    }
  };

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    const matchesSearch =
      inv.invoiceId?.toLowerCase().includes(q) ||
      inv.email?.toLowerCase().includes(q) ||
      inv.relatedId?.toLowerCase().includes(q);

    const matchesType =
      filterType === "all" || inv.type === filterType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Invoice Center</h1>

        <div className="flex gap-3 items-center">
          <Input
            placeholder="Search by Invoice ID, Email, or Booking ID"
            className="max-w-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="border rounded-md p-2"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="booking">Booking Invoices</option>
            <option value="refund">Refund Invoices</option>
          </select>

          <Button onClick={fetchInvoices} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      <Card className="shadow-sm overflow-x-auto">
        <CardContent className="p-4">
          {loading ? (
            <p>Loading invoices...</p>
          ) : filtered.length === 0 ? (
            <p className="text-gray-500">No invoices found.</p>
          ) : (
            <table className="min-w-full border text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">Invoice ID</th>
                  <th className="p-3 text-left">User</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Amount</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Linked To</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv, idx) => (
                  <tr
                    key={idx}
                    className="border-b hover:bg-gray-50 transition-all"
                  >
                    <td className="p-3 capitalize">{inv.type}</td>
                    <td className="p-3 font-medium">{inv.invoiceId}</td>
                    <td className="p-3">{inv.name || "-"}</td>
                    <td className="p-3">{inv.email || "-"}</td>
                    <td className="p-3">₹{inv.amount}</td>
                    <td
                      className={`p-3 capitalize font-medium ${
                        inv.status === "processed" || inv.status === "paid"
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {inv.status}
                    </td>
                    <td className="p-3 text-gray-600">{inv.relatedId}</td>
                    <td className="p-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(inv.invoiceUrl, "_blank")}
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResend(inv.type, inv.id)}
                      >
                        Re-send
                      </Button>
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
