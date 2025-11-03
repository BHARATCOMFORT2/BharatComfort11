"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getFirebaseIdToken } from "@/lib/firebase-auth"; // your helper for user token

interface Booking {
  id: string;
  amount: number;
  checkIn: string;
  checkOut: string;
  paymentMode: string;
  paymentStatus: string;
  status: string;
  createdAt?: { seconds: number };
}

export default function UserBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = await getFirebaseIdToken();
      const res = await fetch("/api/bookings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setBookings(data.bookings || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
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
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message || "Booking cancelled successfully");
        fetchBookings();
      } else {
        toast.error(data.error || "Cancellation failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error cancelling booking");
    }
  };

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

            {/* Cancel button logic */}
            <div className="mt-3 md:mt-0">
              {b.status === "confirmed" || b.status === "confirmed_unpaid" ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleCancel(b.id)}
                >
                  Cancel Booking
                </Button>
              ) : (
                <span className="text-sm text-gray-500">
                  {b.status.startsWith("cancel")
                    ? "Already cancelled"
                    : "Not cancellable"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
