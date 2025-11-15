// lib/payments/client.ts
// Final stable Razorpay client for BHARATCOMFORT11

import "@/lib/payments/providers/razorpay"; 
import { getProvider } from "@/lib/payments/core";

/**
 * 🚀 Unified Razorpay payment starter (Bookings, Subscriptions, Offers)
 */
export async function startPayment({
  amount,
  bookingId,
  listingId,
  name,
  email,
  phone,
  onSuccess,
  onFailure,
}: {
  amount: number;
  bookingId: string;
  listingId?: string;
  name: string;
  email: string;
  phone?: string;
  onSuccess: (msg: string) => void;
  onFailure: (msg: string) => void;
}) {
  try {
    /* ---------------------------------------------------------
       1️⃣ CREATE RAZORPAY ORDER ON SERVER
    --------------------------------------------------------- */
    const res = await fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        bookingId,
        listingId,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to create Razorpay order");
    }

    const order = data.razorpayOrder;
    const key = data.key;

    if (!order?.id) {
      throw new Error("Razorpay order ID missing");
    }

    /* ---------------------------------------------------------
       2️⃣ OPEN RAZORPAY CHECKOUT POPUP
    --------------------------------------------------------- */
    const provider = getProvider(); // razorpay provider
    provider.openCheckout({
      amount,
      currency: order.currency,
      orderId: order.id,
      name,
      email,
      phone,
      onSuccess: async (payload: any) => {
        /* -----------------------------------------------------
           3️⃣ VERIFY PAYMENT ON SERVER
        ----------------------------------------------------- */
        try {
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              payload,
              bookingId,
            }),
          });

          const verifyData = await verifyRes.json();

          if (verifyData.success) {
            onSuccess("Payment verified successfully!");
          } else {
            onFailure(verifyData.error || "Payment verification failed");
          }
        } catch (err: any) {
          console.error("Verification error:", err);
          onFailure("Server verification failed");
        }
      },
      onFailure: (err: any) => {
        onFailure(err.error || "Payment cancelled");
      },
    });
  } catch (err: any) {
    console.error("Payment error:", err);
    onFailure(err.message || "Payment process failed");
  }
}
