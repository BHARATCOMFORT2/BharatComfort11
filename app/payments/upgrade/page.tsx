"use client";

import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function UpgradeSubscriptionPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const subscriptionId = searchParams.get("subscriptionId");
  const plan = searchParams.get("plan") || "premium";

  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user) {
      alert("Please log in to upgrade.");
      return;
    }

    try {
      setLoading(true);

      // Create a new Razorpay subscription via API
      const res = await fetch("/api/payments/upgrade-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId, plan, userId: user.uid }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const { razorpaySubscriptionId, key } = data;

      const options = {
        key,
        subscription_id: razorpaySubscriptionId,
        name: "BharatComfort",
        description: `Upgrade to ${plan} plan`,
        handler: function (response: any) {
          alert("✅ Subscription upgraded successfully!");
          window.location.href = "/user/subscriptions";
        },
        prefill: {
          email: user.email,
        },
        theme: { color: "#0f172a" },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      console.error(err);
      alert("Error upgrading subscription: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <p className="text-center text-gray-600">Please log in to upgrade your plan.</p>;
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Upgrade Subscription</h1>
      <p className="text-gray-600">
        You are upgrading subscription <strong>{subscriptionId}</strong> to the{" "}
        <strong>{plan}</strong> plan.
      </p>

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
