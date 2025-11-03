"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getFirebaseIdToken } from "@/lib/firebase-auth";

interface Booking {
  id: string;
  amount: number;
  paymentMode: string;
  paymentStatus: string;
  status: string;
  checkIn: string;
  checkOut: string;
  refundStatus?: string;
  refundId?: string;
  createdAt?: { seconds: number };
  partnerId?: string;
  listingId?: string;
}

export default function BookingDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const token = await getFirebaseIdToken();
      const res = await fetch(`/api/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        const found = data.bookings.find((b: Booking) => b.id === id);
        if (found) setBooking(found);
        else toast.error("Booking not found");
      } else {
        toast.error(data.error || "Unable to load booking details");
      }
    } catch (error) {
      console.error("Booking details error:", error);
      toast.error("Failed to fetch booking details");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!booking) return;
    const confirmCancel = confirm("Are you sure you want to cancel this booking?");
    if (!confirmCancel) return;

    try {
      const token = await getFirebaseIdToken();
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId: booking.id }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchBooking();
      } else {
        toast.error(data.error || "Cancellation failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error cancelling booking");
    }
  };

  const handleDownloadInvoice = async () => {
    toast.info("Generating invoice...");
    // You’ll connect this to /api/invoices/[bookingId] later
    setTimeout(() => toast.success("Invoice downloaded (mock)."), 800);
  };

  if (loading) {
    return <p className="p-6 text-center text-gray-500">Loading booking details...</p>;
  }

  if (!booking) {
    return <p className="p-6 text-center text-gray-500">Booking not found.</p>;
  }

  const createdAt = booking.createdAt
    ? new Date(booking.createdAt.seconds * 1000).toLocaleString()
    : "—";
  const isCancellable =
    booking.status === "confirmed" || booking.status === "confirmed_unpaid";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-3">Booking Details</h1>

      <div className="border rounded-xl shadow-sm p-4 space-y-3">
        <p className="text-sm text-gray-600">Booking ID: <b>{booking.id}</b></p>
        <p className="text-sm">Created: {createdAt}</p>
        <p className="text-sm">Amount: ₹{booking.amount}</p>
        <p className="text-sm">
          Payment Mode:{" "}
          <span className="capitalize font-medium">{booking.paymentMode}</span>
        </p>
        <p className="text-sm">
          Payment Status:{" "}
          <span
            className={`font-semibold ${
              booking.paymentStatus === "paid"
                ? "text-green-600"
                : "text-yellow-600"
            }`}
          >
            {booking.paymentStatus}
          </span>
        </p>
        <p className="text-sm">
          Booking Status:{" "}
          <span
            className={`font-semibold ${
              booking.status.includes("cancel")
                ? "text-red-600"
                : booking.status.includes("confirm")
                ? "text-green-600"
                : "text-yellow-600"
            }`}
          >
            {booking.status}
          </span>
        </p>
        <p className="text-sm">
          Check-In: {new Date(booking.checkIn).toLocaleString()}
          <br />
          Check-Out: {new Date(booking.checkOut).toLocaleString()}
        </p>

        {booking.refundStatus && (
          <p className="text-sm">
            Refund Status:{" "}
            <span
              className={`font-semibold ${
                booking.refundStatus === "processed"
                  ? "text-green-600"
                  : "text-yellow-600"
              }`}
            >
              {booking.refundStatus}
            </span>
          </p>
        )}

        {booking.refundId && (
          <p className="text-sm text-gray-600">
            Refund ID: <b>{booking.refundId}</b>
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          {isCancellable && (
            <Button variant="destructive" onClick={handleCancel}>
              Cancel Booking
            </Button>
          )}
          {booking.paymentStatus === "paid" && (
            <Button variant="outline" onClick={handleDownloadInvoice}>
              Download Invoice
            </Button>
          )}
          <Button variant="secondary" onClick={() => router.push("/user/dashboard/bookings")}>
            Back to Bookings
          </Button>
        </div>
      </div>
    </div>
  );
}
