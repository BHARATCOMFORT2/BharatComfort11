import Razorpay from "razorpay";
import crypto from "crypto";

/* ==============================================================
 🧩 SERVER-SIDE INITIALIZATION
 ============================================================== */

let razorpayInstance: Razorpay | null = null;

/**
 * Returns or creates a singleton Razorpay instance (server-side)
 */
export function getRazorpayServerInstance(): Razorpay | null {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.warn(
        "⚠️ Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in environment."
      );
      return null;
    }

    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  return razorpayInstance;
}

/** ✅ Exported Razorpay client for API routes */
export const razorpay = getRazorpayServerInstance();

/* ==============================================================
 💳 CREATE ORDER (SERVER)
 ============================================================== */

interface CreateOrderInput {
  amount: number;
  currency?: string;
  receipt?: string;
}

/**
 * Creates a Razorpay order (server-side only)
 */
export async function createOrder({
  amount,
  currency = "INR",
  receipt,
}: CreateOrderInput) {
  if (!amount || amount <= 0)
    throw new Error("Amount must be greater than 0");

  if (!razorpay)
    throw new Error(
      "⚠️ Razorpay client not initialized. Check your .env keys."
    );

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100), // convert INR → paise
    currency,
    receipt: receipt || `rcpt_${Date.now()}`,
  });

  return order;
}

/* ==============================================================
 🔐 VERIFY PAYMENT (SERVER)
 ============================================================== */

/**
 * Verify payment signature sent from Razorpay
 */
export function verifyPayment({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): boolean {
  try {
    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const sign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(sign)
      .digest("hex");
    return expected === razorpay_signature;
  } catch (err) {
    console.error("❌ Error verifying Razorpay signature:", err);
    return false;
  }
}

/* ==============================================================
 💻 CLIENT-SIDE CHECKOUT
 ============================================================== */

interface OpenCheckoutInput {
  amount: number;
  orderId: string;
  name: string;
  email: string;
  phone?: string;
  onSuccess?: (response: any) => void;
  onFailure?: (response: any) => void;
}

/**
 * Opens Razorpay Checkout modal (client-side only)
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

  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID; // ✅ unified public key
  if (!key) {
    console.warn("⚠️ NEXT_PUBLIC_RAZORPAY_KEY_ID missing in .env.local");
    if (onFailure) onFailure({ error: "Razorpay key not configured" });
    return;
  }

  const options: any = {
    key,
    amount: Math.round(amount * 100),
    currency: "INR",
    order_id: orderId,
    name: name || "Payment",
    prefill: { email, contact: phone },
    theme: { color: "#2563eb" },
    handler: (response: any) => {
      console.log("✅ Payment Success:", response);
      if (onSuccess) onSuccess(response);
    },
    modal: {
      ondismiss: () => {
        console.warn("⚠️ Payment popup closed");
        if (onFailure) onFailure({ error: "Payment cancelled" });
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
