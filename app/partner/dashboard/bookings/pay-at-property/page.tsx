"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

type FireTS = { seconds: number; nanoseconds?: number };

interface Booking {
  id: string;
  userId: string;
  userEmail?: string;
  partnerId: string;
  listingId: string;
  amount: number;
  checkIn: string;
  checkOut: string;
  paymentMode: "pay_at_hotel" | "pay_at_restaurant" | "razorpay";
  paymentStatus: "unpaid" | "pending" | "paid";
  status:
    | "pending_payment"
    | "confirmed_unpaid"
    | "checked_in_unpaid"
    | "confirmed"
    | "cancel_requested"
    | "cancelled_unpaid";
  createdAt?: FireTS;
  updatedAt?: FireTS;
}

export default function PartnerPayAtPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [opBusy, setOpBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "hotel" | "restaurant" | "due" | "checkedin">(
    "all"
  );
  const [search, setSearch] = useState("");

  // ---- Helpers ----
  const getToken = async () => {
    const auth = getAuth();
    const u = auth.currentUser;
    if (!u) throw new Error("Not authenticated");
    return u.getIdToken();
  };

  const fetchPartnerBookings = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch("/api/bookings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load bookings");
      setBookings(
        (data.bookings as Booking[]).filter((b) =>
          b.paymentMode === "pay_at_hotel" || b.paymentMode === "pay_at_restaurant"
            ? true
            : false
        )
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartnerBookings();
  }, []);

  // ---- Actions ----
  const updateBooking = async (bookingId: string, payload: Partial<Booking>) => {
    try {
      setOpBusy(bookingId);
      const token = await getToken();
      const res = await fetch("/api/bookings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId, ...payload }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Update failed");
      toast.success("Updated successfully");
      await fetchPartnerBookings();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Action failed");
    } finally {
      setOpBusy(null);
    }
  };

  const onConfirmCheckIn = async (b: Booking) => {
    if (!confirm(`Confirm check-in for booking ${b.id}?`)) return;
    await updateBooking(b.id, { status: "checked_in_unpaid" });
  };

  const onMarkPaidOnSite = async (b: Booking) => {
    if (!confirm(`Mark PAID on-site for booking ${b.id}?`)) return;
    // mark payment paid and status confirmed
    await updateBooking(b.id, { paymentStatus: "paid", status: "confirmed" });
  };

  const onRefresh = () => fetchPartnerBookings();

  // ---- Filters/Search ----
  const filtered = useMemo(() => {
    let rows = bookings;
    if (filter === "hotel") {
      rows = rows.filter((b) => b.paymentMode === "pay_at_hotel");
    } else if (filter === "restaurant") {
      rows = rows.filter((b) => b.paymentMode === "pay_at_restaurant");
    } else if (filter === "due") {
      rows = rows.filter(
        (b) =>
          (b.status === "confirmed_unpaid" || b.status === "checked_in_unpaid") &&
          b.paymentStatus === "unpaid"
      );
    } else if (filter === "checkedin") {
      rows = rows.filter((b) => b.status === "checked_in_unpaid");
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (b) =>
          b.id.toLowerCase().includes(q) ||
          b.userEmail?.toLowerCase().includes(q) ||
          b.listingId.toLowerCase().includes(q)
      );
    }

    return rows.sort(
      (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
    );
  }, [bookings, filter, search]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Pay-at-Property Bookings</h1>
        <div className="flex items-center gap-2">
          <input
            placeholder="Search booking/user/listing"
            className="border rounded px-3 py-2 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="border rounded px-3 py-2 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">All</option>
            <option value="hotel">Pay at Hotel</option>
            <option value="restaurant">Pay at Restaurant</option>
            <option value="due">Payment Due</option>
            <option value="checkedin">Checked-in (Unpaid)</option>
          </select>
          <Button onClick={onRefresh} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-3 text-left">Booking</th>
              <th className="p-3 text-left">User</th>
              <th className="p-3 text-left">Listing</th>
              <th className="p-3 text-left">Dates</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Mode</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Payment</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-gray-500">
                  No bookings found.
                </td>
              </tr>
            ) : (
              filtered.map((b) => (
                <tr key={b.id} className="border-b">
                  <td className="p-3">
                    <div className="font-semibold">{b.id}</div>
                    <div className="text-xs text-gray-500">
                      {b.createdAt
                        ? new Date(b.createdAt.seconds * 1000).toLocaleString()
                        : ""}
                    </div>
                  </td>
                  <td className="p-3">
                    <div>{b.userEmail || b.userId}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{b.listingId}</div>
                  </td>
                  <td className="p-3">
                    <div className="text-xs text-gray-700">
                      {new Date(b.checkIn).toLocaleDateString()} →{" "}
                      {new Date(b.checkOut).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="p-3 font-semibold">₹{b.amount}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        b.paymentMode === "pay_at_hotel"
                          ? "bg-green-100 text-green-700"
                          : b.paymentMode === "pay_at_restaurant"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {b.paymentMode.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        b.status === "confirmed_unpaid"
                          ? "bg-yellow-100 text-yellow-700"
                          : b.status === "checked_in_unpaid"
                          ? "bg-orange-100 text-orange-700"
                          : b.status === "confirmed"
                          ? "bg-emerald-100 text-emerald-700"
                          : b.status.includes("cancel")
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        b.paymentStatus === "unpaid"
                          ? "bg-rose-100 text-rose-700"
                          : b.paymentStatus === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {b.paymentStatus}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {/* Confirm check-in (unpaid) */}
                      {(b.status === "confirmed_unpaid" && b.paymentStatus === "unpaid") && (
                        <Button
                          size="sm"
                          onClick={() => onConfirmCheckIn(b)}
                          disabled={opBusy === b.id}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          {opBusy === b.id ? "Working..." : "Confirm Check-in"}
                        </Button>
                      )}

                      {/* Mark paid on-site */}
                      {(b.paymentStatus === "unpaid" &&
                        (b.status === "checked_in_unpaid" || b.status === "confirmed_unpaid")) && (
                        <Button
                          size="sm"
                          onClick={() => onMarkPaidOnSite(b)}
                          disabled={opBusy === b.id}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          {opBusy === b.id ? "Working..." : "Mark Paid On-site"}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500">
        Tip: Use the filters to see unpaid due bookings or checked-in guests. Mark “Paid On-site”
        to finalize and move them to confirmed.
      </div>
    </div>
  );
}
