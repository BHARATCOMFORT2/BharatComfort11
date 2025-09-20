"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { getFirestore } from "firebase/firestore";
import { app } from "./firebase";
export const db = getFirestore(app);
import { collection, query, where, getDocs } from "firebase/firestore";

interface Subscription {
  id: string;
  plan: string;
  status: string;
  end: number;
}

export default function ManageSubscriptionsPage() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchSubs = async () => {
      const subsRef = collection(db, "subscriptions");
      const subsQuery = query(subsRef, where("userId", "==", user.uid));
      const subsSnap = await getDocs(subsQuery);
      const subsData = subsSnap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Subscription),
      }));
      setSubscriptions(subsData);
    };

    fetchSubs();
  }, [user]);

  const handleCancel = async (subId: string) => {
    try {
      setLoading(true);
      const res = await fetch("/api/payments/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: subId }),
      });
      if (!res.ok) throw new Error("Failed to cancel subscription");

      alert("Subscription cancelled successfully");
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id === subId ? { ...s, status: "cancelled" } : s
        )
      );
    } catch (err) {
      console.error(err);
      alert("Error cancelling subscription");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (subId: string, newPlan: string) => {
    // Redirect to a plan selection page
    window.location.href = `/payments/upgrade?subscriptionId=${subId}&plan=${newPlan}`;
  };

  if (!user) {
    return <p className="text-center text-gray-600">Please log in to manage subscriptions.</p>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Manage Subscriptions</h1>

      {subscriptions.length === 0 ? (
        <p className="text-gray-500">You have no subscriptions.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {subscriptions.map((sub) => (
            <li key={sub.id} className="py-4 flex justify-between items-center">
              <div>
                <p className="font-medium">Plan: {sub.plan}</p>
                <p className="text-sm text-gray-500">Status: {sub.status}</p>
                <p className="text-sm text-gray-500">
                  Ends on: {new Date(sub.end * 1000).toLocaleDateString()}
                </p>
              </div>
              <div className="space-x-3">
                {sub.status === "active" && (
                  <>
                    <button
                      onClick={() => handleCancel(sub.id)}
                      disabled={loading}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleUpgrade(sub.id, "premium")}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Upgrade
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
