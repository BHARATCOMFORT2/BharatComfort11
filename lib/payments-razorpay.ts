import Razorpay from "razorpay";
import crypto from "crypto";

/* ==============================================================
 🧩  SERVER-SIDE INITIALIZATION (SAFE FOR NETLIFY)
 ============================================================== */

let razorpayInstance: Razorpay | null = null;

/**
 * ✅ Get Razorpay credentials safely (supports both server + build envs)
 */
function getKeys() {
  const keyId =
    process.env.RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

  return { keyId: keyId.trim(), keySecret: keySecret.trim() };
}

/**
 * ✅ Create and reuse a Razorpay instance (server-side only)
 */
export function getRazorpayServerInstance(): Razorpay | null {
  const { keyId, keySecret } = getKeys();

  if (!keyId || !keySecret) {
    console.warn("⚠️ Missing Razorpay environment keys:", {
      keyId: !!keyId,
      keySecret: !!keySecret,
    });
    return null;
  }

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    console.log("✅ Razorpay instance initialized successfully");
  }

  return razorpayInstance;
}

/** Exported instance for API routes */
export const razorpay = getRazorpayServerInstance();

/* ==============================================================
 💳  CREATE ORDER (SERVER)
 ============================================================== */

interface CreateOrderInput {
  amount: number;
  currency?: string;
  receipt?: string;
}

/**
 * ✅ Create a Razorpay order securely (server-side)
 */
export async function createOrder({
  amount,
  currency = "INR",
  receipt,
}: CreateOrderInput) {
  if (!amount || amount <= 0)
    throw new Error("Amount must be greater than 0");

  const instance = getRazorpayServerInstance();
  if (!instance)
    throw new Error(
      "⚠️ Razorpay instance not initialized. Check environment keys."
    );

  const order = await instance.orders.create({
    amount: Math.round(amount * 100), // convert INR → paise
    currency,
    receipt: receipt || `rcpt_${Date.now()}`,
  });

  return order;
}

/* ==============================================================
 🔐  VERIFY PAYMENT SIGNATURE (SERVER)
 ============================================================== */

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
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new Error("Razorpay secret key missing");

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
 💻  CLIENT-SIDE CHECKOUT (BROWSER)
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
 * ✅ Open Razorpay Checkout modal (client-side)
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

  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!key) {
    console.warn("⚠️ NEXT_PUBLIC_RAZORPAY_KEY_ID missing in environment");
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
      console.log("✅ Payment successful:", response);
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
    console.error("❌ Razorpay Checkout Error:", err);
    if (onFailure) onFailure({ error: err });
  }
}
