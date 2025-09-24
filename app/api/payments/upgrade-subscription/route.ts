'use client';

import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

// Dynamically load Razorpay checkout script
const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) return resolve(true);
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function UpgradeSubscriptionPage() {
  const { firebaseUser: user } = useAuth();
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [plan, setPlan] = useState<string>("premium");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false); // ensure client-side

  // Get query params safely on client
  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    setSubscriptionId(params.get("subscriptionId"));
    setPlan(params.get("plan") || "premium");
  }, []);

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

      // Load Razorpay script dynamically
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        alert("Failed to load Razorpay script. Try again later.");
        return;
      }

      // Call API to create Razorpay subscription
      const res = await fetch("/api/payments/upgrade-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId, plan, userId: user.uid }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to create subscription");

      const { razorpaySubscriptionId, key } = data;

      // Open Razorpay checkout
      const options = {
        key,
        subscription_id: razorpaySubscriptionId,
        name: "BharatComfort",
        description: `Upgrade to ${plan} plan`,
        handler: function () {
          alert("✅ Subscription upgraded successfully!");
          window.location.href = "/user/subscriptions";
        },
        prefill: { email: user.email },
        theme: { color: "#0f172a" },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      console.error(err);
      alert("Error upgrading subscription: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null; // wait until client mount
  if (!user) return <p className="text-center text-gray-600">Please log in to upgrade your plan.</p>;

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Upgrade Subscription</h1>
      <p className="text-gray-600">
        You are upgrading subscription <strong>{subscriptionId}</strong> to the <strong>{plan}</strong> plan.
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
