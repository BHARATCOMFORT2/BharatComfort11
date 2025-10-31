// lib/payments-razorpay.ts
import Razorpay from "razorpay";
import crypto from "crypto";

let razorpayInstance: Razorpay | null = null;

/* ============================================================
   🔐 RESOLVE RAZORPAY SECRET
   (Supports Base64 or plain secret key)
============================================================ */
function resolveSecret(): string | null {
  const rawSecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  const encoded = process.env.RAZORPAY_KEY_SECRET_BASE64?.trim();

  if (rawSecret) return rawSecret;
  if (encoded) {
    try {
      return Buffer.from(encoded, "base64").toString("utf8");
    } catch (err) {
      console.error("❌ Failed to decode Base64 Razorpay secret:", err);
    }
  }
  return null;
}

/* ============================================================
   ⚙️ FETCH RAZORPAY KEYS
============================================================ */
function getKeys() {
  const keyId =
    process.env.RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    "";
  const keySecret = resolveSecret();

  if (!keyId || !keySecret) {
    console.error("❌ Missing Razorpay environment keys.");
  }

  return { keyId: keyId.trim(), keySecret: keySecret?.trim() || "" };
}

/* ============================================================
   🚀 GET SERVER INSTANCE (Singleton)
============================================================ */
export function getRazorpayServerInstance(): Razorpay | null {
  const { keyId, keySecret } = getKeys();

  if (!keyId || !keySecret) return null;

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
    console.log("✅ Razorpay instance initialized");
  }

  return razorpayInstance;
}

/* ============================================================
   💳 CREATE ORDER (Server-side only)
============================================================ */
export async function createOrder({
  amount,
  currency = "INR",
  receipt,
}: {
  amount: number;
  currency?: string;
  receipt?: string;
}) {
  if (!amount || amount <= 0) throw new Error("Invalid amount");

  const instance = getRazorpayServerInstance();
  if (!instance) throw new Error("Razorpay instance not initialized");

  return await instance.orders.create({
    amount: Math.round(amount * 100),
    currency,
    receipt: receipt || `rcpt_${Date.now()}`,
  });
}

/* ============================================================
   🔏 VERIFY SIGNATURE
============================================================ */
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
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  return expected === razorpay_signature;
}

/* ============================================================
   🪄 OPEN CHECKOUT (Client-side only)
============================================================ */
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
  phone,
  onSuccess,
  onFailure,
}: OpenCheckoutInput) {
  if (typeof window === "undefined") return;

  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!key) {
    console.error("❌ NEXT_PUBLIC_RAZORPAY_KEY_ID not set");
    return;
  }

  const options: any = {
    key,
    amount: Math.round(amount * 100),
    currency: "INR",
    order_id: orderId,
    name,
    prefill: {
      email,
      contact: phone || "",
    },
    theme: { color: "#f59e0b" }, // BharatComfort theme color
    handler: (response: any) => onSuccess?.(response),
    modal: {
      ondismiss: () => onFailure?.({ error: "Payment cancelled" }),
    },
  };

  try {
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  } catch (err) {
    console.error("❌ Razorpay Checkout Error:", err);
    onFailure?.(err);
  }
}
