"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firestore";
import { collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";

interface Subscription {
  id: string;
  status: string;
  plan: string;
  start: number;
  end: number;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  subscriptionId: string;
  createdAt: number;
}

export default function UserSubscriptionsPage() {
  const { firebaseUser: user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const subsRef = collection(db, "subscriptions");
      const subsQuery = query(subsRef, where("userId", "==", user.uid));
      const subsSnap = await getDocs(subsQuery);
    const subsData = subsSnap.docs.map((doc) => ({
  ...(doc.data() as Subscription),
  id: doc.id, // now overwrites any existing id safely
}));

setSubscriptions(subsData);


      const payRef = collection(db, "payments");
      const payQuery = query(payRef, where("userId", "==", user.uid));
      const paySnap = await getDocs(payQuery);
      const payData = paySnap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Payment),
      }));
      setPayments(payData);
    };

    fetchData();
  }, [user]);

  if (!user) {
    return <p className="text-center text-gray-600">Please log in to view subscriptions.</p>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">My Subscriptions</h1>

      {/* Subscriptions */}
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">Active Plans</h2>
        {subscriptions.length === 0 ? (
          <p className="text-gray-500">No active subscriptions found.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {subscriptions.map((sub) => (
              <li key={sub.id} className="py-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Plan: {sub.plan}</p>
                    <p className="text-sm text-gray-500">Status: {sub.status}</p>
                    <p className="text-sm text-gray-500">
                      Valid: {new Date(sub.start * 1000).toLocaleDateString()} →{" "}
                      {new Date(sub.end * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  {sub.status === "active" && (
                    <Link
                      href="/payments/manage"
                      className="text-blue-600 hover:underline"
                    >
                      Manage
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Payments */}
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">Payment History</h2>
        {payments.length === 0 ? (
          <p className="text-gray-500">No payments recorded.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {payments.map((pay) => (
              <li key={pay.id} className="py-3">
                <div className="flex justify-between">
                  <span>
                    {pay.currency.toUpperCase()} {(pay.amount / 100).toFixed(2)}
                  </span>
                  <span
                    className={`${
                      pay.status === "captured"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {pay.status}
                  </span>
                  <span className="text-gray-500">
                    {new Date(pay.createdAt * 1000).toLocaleDateString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
