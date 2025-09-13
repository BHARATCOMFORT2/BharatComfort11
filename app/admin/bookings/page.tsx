"use client";

import { useAllBookings } from "@/hooks/useAllBookings";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export default function AdminBookingsPage() {
  const { bookings, loading } = useAllBookings();

  async function updateStatus(id: string, status: string) {
    await updateDoc(doc(db, "bookings", id), { status });
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p>Loading all bookings...</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold">No bookings found</h2>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">All Bookings (Admin)</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full border rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">User ID</th>
              <th className="px-4 py-2 text-left">Listing</th>
              <th className="px-4 py-2 text-left">Amount</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Payment ID</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="px-4 py-2">{b.userId}</td>
                <td className="px-4 py-2">{b.listingId || "N/A"}</td>
                <td className="px-4 py-2">₹{b.amount}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      b.status === "confirmed"
                        ? "text-green-600 font-medium"
                        : b.status === "pending"
                        ? "text-yellow-600 font-medium"
                        : "text-red-600 font-medium"
                    }
                  >
                    {b.status}
                  </span>
                </td>
                <td className="px-4 py-2">{b.paymentId || "-"}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => updateStatus(b.id, "confirmed")}
                    className="px-2 py-1 text-sm bg-green-500 text-white rounded mr-2"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => updateStatus(b.id, "cancelled")}
                    className="px-2 py-1 text-sm bg-red-500 text-white rounded"
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
