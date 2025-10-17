"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { openRazorpayCheckout } from "@/lib/payments-razorpay"; // ✅ unified Razorpay helper
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function UpgradeSubscriptionPage() {
  const { firebaseUser: user } = useAuth();
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [plan, setPlan] = useState<string>("premium");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("idle");

  // Get query params safely on client-side
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSubscriptionId(params.get("subscriptionId"));
    setPlan(params.get("plan") || "premium");
  }, []);

  // ✅ Real-time listener for subscription document (optional enhancement)
  useEffect(() => {
    if (!user || !subscriptionId) return;
    const ref = doc(db, "subscriptions", subscriptionId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setStatus(snap.data().status || "active");
      }
    });
    return () => unsub();
  }, [user, subscriptionId]);

  const handleUpgrade = async () => {
    if (!user) {
      alert("Please log in to upgrade.");
      return;
    }
    if (!subscriptionId) {
      alert("Invalid subscription ID");
      return;
    }

    try {
      setLoading(true);

      // ✅ Step 1: Create Razorpay subscription via backend
      const res = await fetch("/api/payments/upgrade-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId, plan, userId: user.uid }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to create subscription");

      // ✅ Step 2: Open Razorpay Checkout
      openRazorpayCheckout({
        amount: data.amount,
        orderId: data.razorpaySubscriptionId,
        name: "BharatComfort",
        email: user.email,
        onSuccess: async (response: any) => {
          // ✅ Step 3: Verify payment
          const verify = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: user.uid,
              plan,
              subscriptionId,
            }),
          });

          const result = await verify.json();
          if (result.success) {
            alert("✅ Subscription upgraded successfully!");
            window.location.href = `/user/subscriptions?subscriptionId=${subscriptionId}`;
          } else {
            alert("❌ Verification failed. Contact support.");
          }
        },
        onFailure: () => alert("❌ Payment cancelled or failed."),
      });
    } catch (err: any) {
      console.error(err);
      alert("Error upgrading subscription: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user)
    return (
      <p className="text-center text-gray-600 mt-10">
        Please log in to upgrade your plan.
      </p>
    );

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6 bg-white rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold text-gray-800">Upgrade Subscription</h1>
      <p className="text-gray-600">
        You are upgrading <strong>{subscriptionId}</strong> to the{" "}
        <strong>{plan}</strong> plan.
      </p>

      <div className="border rounded-lg p-3 bg-gray-50">
        <p>
          <strong>Current Status:</strong>{" "}
          <span
            className={`font-semibold ${
              status === "active" ? "text-green-600" : "text-yellow-600"
            }`}
          >
            {status}
          </span>
        </p>
      </div>

      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Processing..." : "Upgrade Now"}
      </button>
    </div>
  );
}
