"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Payment {
  id?: string;          // Firestore doc id
  amount: number;
  status: string;
  method?: string;
  createdAt?: any;
  [key: string]: any;   // allow extra fields
}

export default function ManagePaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "payments"));
      const data: Payment[] = querySnapshot.docs.map((docSnap) => {
        const paymentData = docSnap.data() as Payment;
        return {
          ...paymentData,
          id: docSnap.id
        };
      });
      setPayments(data);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, "payments", id), { status: "approved" });
      await fetchPayments();
    } catch (err) {
      console.error("Error approving payment:", err);
    }
  };

  const handleRefund = async (id: string) => {
    try {
      await updateDoc(doc(db, "payments", id), { status: "refunded" });
      await fetchPayments();
    } catch (err) {
      console.error("Error refunding payment:", err);
    }
  };

  const confirmDelete = (id: string) => {
    setDeleteId(id);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, "payments", deleteId));
      await fetchPayments();
      setDeleteId(null);
    } catch (err) {
      console.error("Error deleting payment:", err);
    }
  };

  if (loading) return <p className="p-4">Loading payments...</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Manage Payments</h1>

      {payments.length === 0 ? (
        <p>No payments found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300 rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left border">ID</th>
                <th className="p-2 text-left border">Amount</th>
                <th className="p-2 text-left border">Status</th>
                <th className="p-2 text-left border">Method</th>
                <th className="p-2 text-left border">Created At</th>
                <th className="p-2 text-left border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="p-2 border">{payment.id}</td>
                  <td className="p-2 border">₹{payment.amount}</td>
                  <td className="p-2 border">{payment.status}</td>
                  <td className="p-2 border">{payment.method || "-"}</td>
                  <td className="p-2 border">
                    {payment.createdAt?.toDate
                      ? payment.createdAt.toDate().toLocaleString()
                      : "-"}
                  </td>
                  <td className="p-2 border space-x-2">
                    <button
                      onClick={() => handleApprove(payment.id!)}
                      className="px-2 py-1 bg-green-500 text-white rounded text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRefund(payment.id!)}
                      className="px-2 py-1 bg-yellow-500 text-white rounded text-sm"
                    >
                      Refund
                    </button>
                    <button
                      onClick={() => confirmDelete(payment.id!)}
                      className="px-2 py-1 bg-red-600 text-white rounded text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h2 className="text-lg font-bold mb-4">Confirm Delete</h2>
            <p className="mb-6">
              Are you sure you want to delete this payment? This action cannot
              be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
