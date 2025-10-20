import Razorpay from "razorpay";
import crypto from "crypto";

let razorpayInstance: Razorpay | null = null;

/**
 * ✅ Safely resolve the Razorpay secret (supports Base64 fallback)
 */
function resolveSecret(): string | null {
  const rawSecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  const encoded = process.env.RAZORPAY_KEY_SECRET_BASE64?.trim();

  if (rawSecret) return rawSecret;
  if (encoded) {
    try {
      return Buffer.from(encoded, "base64").toString("utf8");
    } catch (err) {
      console.error("❌ Failed to decode RAZORPAY_KEY_SECRET_BASE64:", err);
    }
  }
  return null;
}

/**
 * ✅ Get and validate Razorpay credentials
 */
function getKeys() {
  const keyId =
    process.env.RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    "";
  const keySecret = resolveSecret();
  return { keyId: keyId.trim(), keySecret: keySecret?.trim() || "" };
}

/**
 * ✅ Create singleton Razorpay instance (server only)
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

/**
 * ✅ Shared instance for API routes
 */
export const razorpay = getRazorpayServerInstance();

/* ==============================================================
 💳 CREATE ORDER
 ============================================================== */

interface CreateOrderInput {
  amount: number;
  currency?: string;
  receipt?: string;
}

export async function createOrder({
  amount,
  currency = "INR",
  receipt,
}: CreateOrderInput) {
  if (!amount || amount <= 0) throw new Error("Amount must be greater than 0");

  const instance = getRazorpayServerInstance();
  if (!instance)
    throw new Error("Razorpay not initialized. Check environment keys.");

  return await instance.orders.create({
    amount: Math.round(amount * 100),
    currency,
    receipt: receipt || `rcpt_${Date.now()}`,
  });
}

/* ==============================================================
 🔐 VERIFY SIGNATURE
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
  const secret = resolveSecret();
  if (!secret) {
    console.error("❌ Razorpay secret missing — cannot verify payment");
    return false;
  }

  const sign = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(sign)
    .digest("hex");
  return expected === razorpay_signature;
}

/* ==============================================================
 💻 CLIENT CHECKOUT
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
    console.warn("⚠️ NEXT_PUBLIC_RAZORPAY_KEY_ID missing");
    onFailure?.({ error: "Razorpay key not configured" });
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
    handler: (res: any) => onSuccess?.(res),
    modal: { ondismiss: () => onFailure?.({ error: "Payment cancelled" }) },
  };

  try {
    new (window as any).Razorpay(options).open();
  } catch (err) {
    console.error("❌ Razorpay Checkout Error:", err);
    onFailure?.({ error: err });
  }
}
