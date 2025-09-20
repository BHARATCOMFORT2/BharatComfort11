"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase"; // ✅ single db

interface Payment {
  id: string;
  userId: string;
  bookingId: string;
  amount: number;
  status: "success" | "failed";
  razorpay_order_id: string;
  razorpay_payment_id: string;
  createdAt: string;
}

export default function ManagePaymentsPage() {
  const { firbaseUser: user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState<"all" | "success" | "failed">("all");

  useEffect(() => {
    const fetchPayments = async () => {
      const querySnapshot = await getDocs(collection(db, "payments"));
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Payment),
      }));
      setPayments(data);
    };

    fetchPayments();
  }, []);

  if (!user) {
    return <p className="p-4">Please log in to manage payments.</p>;
  }

  // ✅ Apply filter
  const filteredPayments =
    filter === "all"
      ? payments
      : payments.filter((p) => p.status === filter);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Manage Payments</h1>

      {/* Filter Buttons */}
      <div className="mb-4 flex gap-3">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded ${
            filter === "all" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("success")}
          className={`px-4 py-2 rounded ${
            filter === "success" ? "bg-green-600 text-white" : "bg-gray-200"
          }`}
        >
          Success
        </button>
        <button
          onClick={() => setFilter("failed")}
          className={`px-4 py-2 rounded ${
            filter === "failed" ? "bg-red-600 text-white" : "bg-gray-200"
          }`}
        >
          Failed
        </button>
      </div>

      {/* Payments Table */}
      <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3 border">Booking ID</th>
            <th className="p-3 border">User ID</th>
            <th className="p-3 border">Amount</th>
            <th className="p-3 border">Status</th>
            <th className="p-3 border">Payment ID</th>
            <th className="p-3 border">Order ID</th>
            <th className="p-3 border">Created At</th>
          </tr>
        </thead>
        <tbody>
          {filteredPayments.map((payment) => (
            <tr key={payment.id} className="text-center">
              <td className="p-3 border">{payment.bookingId}</td>
              <td className="p-3 border">{payment.userId}</td>
              <td className="p-3 border">₹{payment.amount}</td>
              <td
                className={`p-3 border font-semibold ${
                  payment.status === "success"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {payment.status}
              </td>
              <td className="p-3 border">{payment.razorpay_payment_id}</td>
              <td className="p-3 border">{payment.razorpay_order_id}</td>
              <td className="p-3 border">
                {new Date(payment.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filteredPayments.length === 0 && (
        <p className="text-gray-500 mt-4">No payments found.</p>
      )}
    </div>
  );
}
