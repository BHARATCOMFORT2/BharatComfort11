"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

interface Booking {
  id: string;
  amount: number;
  checkIn: string;
  checkOut: string;
  paymentMode: string;
  paymentStatus: string;
  status: string;
  invoiceUrl?: string;
  createdAt?: { seconds: number };
}

export default function UserBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  /* -------------------------------------------------------
     ✅ Fetch bookings using session cookie (no Bearer token)
  ------------------------------------------------------- */
  const fetchBookings = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/bookings", {
        credentials: "include", // 👈 IMPORTANT
      });

      const data = await res.json();

      if (data.success) {
        setBookings(data.bookings || []);
      } else {
        toast.error(data.error || "Failed to load bookings");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------------------
     ❗ Cancel Booking (session-based)
  ------------------------------------------------------- */
  const handleCancel = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        credentials: "include", // 👈 IMPORTANT
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Booking cancelled");
        fetchBookings();
      } else {
        toast.error(data.error || "Cancellation failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error cancelling booking");
    }
  };

  /* -------------------------------------------------------
     Invoice Actions
  ------------------------------------------------------- */
  const handleInvoiceDownload = (url?: string) => {
    if (!url) {
      toast("Invoice not available yet.");
      return;
    }
    window.open(url, "_blank");
  };

  const handleInvoiceResend = async (bookingId: string) => {
    try {
      setResending(bookingId);

      const res = await fetch("/api/invoices/send", {
        method: "POST",
        credentials: "include", // 👈 IMPORTANT
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "booking", id: bookingId }),
      });

      const data = await res.json();
      if (data.success) toast.success("Invoice re-sent!");
      else toast.error(data.error || "Failed to re-send invoice");
    } catch (err) {
      console.error(err);
      toast.error("Error re-sending invoice");
    } finally {
      setResending(null);
    }
  };

  /* -------------------------------------------------------
     UI Rendering
  ------------------------------------------------------- */
  if (loading) {
    return <p className="p-4 text-center text-gray-500">Loading your bookings...</p>;
  }

  if (bookings.length === 0) {
    return <p className="p-4 text-center text-gray-500">You have no bookings yet.</p>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">My Bookings</h1>

      <div className="grid gap-4">
        {bookings.map((b) => (
          <div
            key={b.id}
            className="border rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:justify-between md:items-center"
          >
            <div>
              <h2 className="font-semibold text-lg">
                Booking ID: <span className="text-blue-600">{b.id}</span>
              </h2>

              <p className="text-sm text-gray-600">
                Check-in: {new Date(b.checkIn).toLocaleString()} <br />
                Check-out: {new Date(b.checkOut).toLocaleString()}
              </p>

              <p className="text-sm mt-1">
                Amount: ₹{b.amount} &nbsp;|&nbsp; Mode:{" "}
                <span className="font-medium capitalize">{b.paymentMode}</span>
              </p>

              <p className="text-sm text-gray-700">
                Status:{" "}
                <span
                  className={`${
                    b.status.includes("cancel")
                      ? "text-red-600"
                      : b.status.includes("confirmed")
                      ? "text-green-600"
                      : "text-yellow-600"
                  } font-semibold`}
                >
                  {b.status}
                </span>{" "}
                &nbsp;|&nbsp; Payment:{" "}
                <span
                  className={`${
                    b.paymentStatus === "paid"
                      ? "text-green-600"
                      : "text-yellow-600"
                  } font-semibold`}
                >
                  {b.paymentStatus}
                </span>
              </p>
            </div>

            <div className="mt-3 md:mt-0 flex flex-col md:flex-row gap-2">
              {b.status === "confirmed" || b.status === "confirmed_unpaid" ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleCancel(b.id)}
                >
                  Cancel Booking
                </Button>
              ) : (
                <span className="text-sm text-gray-500 self-center">
                  {b.status.startsWith("cancel")
                    ? "Already cancelled"
                    : "Not cancellable"}
                </span>
              )}

              {b.invoiceUrl ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInvoiceDownload(b.invoiceUrl)}
                  >
                    Download Invoice
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={resending === b.id}
                    onClick={() => handleInvoiceResend(b.id)}
                  >
                    {resending === b.id ? "Sending..." : "Re-send Invoice"}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Invoice Pending
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
