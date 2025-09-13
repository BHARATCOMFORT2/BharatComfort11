"use client";

import { useAuth } from "@/hooks/useAuth";
import { useBookings } from "@/hooks/useBookings";

export default function BookingsPage() {
  const { user } = useAuth();
  const { bookings, loading } = useBookings(user?.uid);

  if (!user) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold">Please log in to view bookings</h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p>Loading your bookings...</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold">No bookings yet</h2>
        <p className="text-gray-500">Start booking your next trip!</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Bookings</h1>
      <div className="grid gap-4">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="border rounded-lg p-4 shadow-sm bg-white"
          >
            <h2 className="font-semibold text-lg">
              Booking for {booking.listingId || "Unknown listing"}
            </h2>
            <p className="text-sm text-gray-600">
              Status:{" "}
              <span
                className={
                  booking.status === "confirmed"
                    ? "text-green-600 font-medium"
                    : booking.status === "pending"
                    ? "text-yellow-600 font-medium"
                    : "text-red-600 font-medium"
                }
              >
                {booking.status}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              Amount: ₹{booking.amount}
            </p>
            {booking.checkIn && booking.checkOut && (
              <p className="text-sm text-gray-600">
                {booking.checkIn} → {booking.checkOut}
              </p>
            )}
            <p className="text-xs text-gray-400">
              Payment ID: {booking.paymentId}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
