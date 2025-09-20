"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firestore";
import { collection, query, where, getDocs } from "firebase/firestore";

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  subscriptionId: string;
  createdAt: number;
  invoiceUrl?: string;
}

export default function UserInvoicesPage() {
  const { firebaseUser: user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchInvoices = async () => {
      setLoading(true);
      const ref = collection(db, "payments");
      const q = query(ref, where("userId", "==", user.uid));
      const snap = await getDocs(q);
      const data = snap.docs.map((doc) => ({
  ...(doc.data() as Invoice),
  id: doc.id, // this now safely overwrites any id inside doc.data()
}));
      setInvoices(data);
      setLoading(false);
    };

    fetchInvoices();
  }, [user]);

  if (!user) {
    return <p className="text-center text-gray-600">Please log in to view invoices.</p>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">My Invoices</h1>

      {loading ? (
        <p className="text-gray-500">Loading invoices...</p>
      ) : invoices.length === 0 ? (
        <p className="text-gray-500">No invoices found.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {invoices.map((invoice) => (
            <li key={invoice.id} className="py-4 flex justify-between items-center">
              <div>
                <p className="font-medium">
                  {invoice.currency.toUpperCase()} {(invoice.amount / 100).toFixed(2)}
                </p>
                <p className="text-sm text-gray-500">Status: {invoice.status}</p>
                <p className="text-sm text-gray-500">
                  Date: {new Date(invoice.createdAt * 1000).toLocaleDateString()}
                </p>
              </div>
              <div>
                {invoice.invoiceUrl ? (
                  <a
                    href={invoice.invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Download
                  </a>
                ) : (
                  <span className="text-gray-400 text-sm">Not available</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
