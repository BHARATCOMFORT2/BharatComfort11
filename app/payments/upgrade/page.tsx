'use client';

import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

// Helper to dynamically load Razorpay script
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function UpgradeSubscriptionPage() {
  const { firebaseUser: user } = useAuth();
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

      // Load Razorpay script dynamically
      const loaded = await loadRazorpayS
