// lib/payments-razorpay.ts
import Razorpay from "razorpay";

// ================= SERVER-SIDE =================
let razorpayInstance: Razorpay | null = null;

/**
 * Get Razorpay instance (server-side)
 */
export function getRazorpayServerInstance() {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error("❌ Razorpay server keys are missing!");
    }

    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  return razorpayInstance;
}

// ✅ Named export `razorpay` for API routes
export const razorpay = getRazorpayServerInstance();

interface CreateOrderInput {
  amount: number; // in INR
  currency?: string;
  receipt?: string;
}

/**
 * Create Razorpay order (server-side)
 */
export async function createOrder({
  amount,
  currency = "INR",
  receipt,
}: CreateOrderInput) {
  if (!amount || amount <= 0) throw new Error("Amount must be greater than 0");

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100), // convert to paise
    currency,
    receipt: receipt || `rcpt_${Date.now()}`,
  });

  return order;
}

// ================= CLIENT-SIDE =================
interface OpenCheckoutInput {
  amount: number; // in INR
  orderId: string;
  name: string;
  email: string;
  phone?: string;
  onSuccess?: (response: any) => void;
  onFailure?: (response: any) => void;
}

/**
 * Open Razorpay Checkout (client-side)
 */
export function openRazorpayCheckout({
  amount,
  orderId,
  name,
  email,
  phone = "",
  onSuccess,
  onFailure,
}: OpenCheckoutInput) {
  if (typeof window === "undefined") return;

  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY;
  if (!key) {
    console.error("❌ NEXT_PUBLIC_RAZORPAY_KEY is missing");
    if (onFailure) onFailure({ error: "Payment key not configured" });
    return;
  }

  const options: any = {
    key,
    amount: Math.round(amount * 100),
    currency: "INR",
    order_id: orderId,
    name: name || "Booking",
    prefill: { email, contact: phone },
    theme: { color: "#6366f1" },
    handler: (response: any) => {
      console.log("✅ Payment success:", response);
      if (onSuccess) onSuccess(response);
    },
    modal: {
      ondismiss: () => {
        console.log("⚠️ Payment popup closed");
        if (onFailure) onFailure({ error: "Payment popup closed" });
      },
    },
  };

  try {
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  } catch (err) {
    console.error("❌ Razorpay Checkout error:", err);
    if (onFailure) onFailure({ error: err });
  }
}
