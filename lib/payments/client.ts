// lib/payments/client.ts
// Universal client-side payment trigger for Razorpay (BHARATCOMFORT11)

import "@/lib/payments/providers/razorpay"; // ensures provider registration
import { getProvider } from "@/lib/payments/core";

/**
 * 🚀 Start a payment from anywhere in the app.
 * Works for bookings, partner subscriptions, offers, etc.
 */
export async function startPayment({
  amount,
  context = "booking",
  listingId,
  userId,
  name,
  email,
  phone,
  onSuccess,
  onFailure,
}: {
  amount: number;
  context?: "booking" | "subscription" | "offer" | "ai-trip" | "other";
  listingId?: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  onSuccess: (msg: string) => void;
  onFailure: (msg: string) => void;
}) {
  try {
    // ✅ 1️⃣ Create Razorpay Order
    const res = await fetch("/api/payments/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, context, listingId, userId }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to create order");

    // ✅ 2️⃣ Open Razorpay Checkout
    const provider = getProvider();
    provider.openCheckout({
      amount,
      orderId: data.id,
      currency: data.currency,
      name,
      email,
      phone,
      onSuccess: async (payload: any) => {
        try {
          // ✅ 3️⃣ Verify Payment on Server
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              payload,
              listingId,
              userId,
              context,
            }),
          });

          const verified = await verifyRes.json();
          if (verified.success) onSuccess("Payment verified successfully!");
          else onFailure(verified.error || "Payment verification failed");
        } catch (err: any) {
          console.error("Verification error:", err);
          onFailure("Server verification failed");
        }
      },
      onFailure: (err: any) => onFailure(err.error || "Payment cancelled"),
    });
  } catch (err: any) {
    console.error("Payment error:", err);
    onFailure(err.message || "Unknown error during payment");
  }
}
