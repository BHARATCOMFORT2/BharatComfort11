// lib/payments/razorpay-server.ts
// Safe for Next.js pages + app router

if (typeof window !== "undefined") {
  // Prevent accidental client execution
  throw new Error("razorpay-server.ts was imported on the client");
}

import Razorpay from "razorpay";
import crypto from "crypto";

let razorpayInstance: Razorpay | null = null;

/* ============================================================
   🔐 RESOLVE SECRET
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
   ⚙ KEY FETCH
============================================================ */
function getKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const keySecret = resolveSecret();

  if (!keyId || !keySecret) {
    console.error("❌ Missing Razorpay environment keys.");
  }

  return { keyId: keyId.trim(), keySecret: keySecret?.trim() || "" };
}

/* ============================================================
   🚀 SINGLETON INSTANCE
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
   💳 ORDER CREATION
============================================================ */
export async function createOrder({ amount, currency = "INR", receipt }: any) {
  if (!amount || amount <= 0) throw new Error("Invalid amount");

  const instance = getRazorpayServerInstance();
  if (!instance) throw new Error("Razorpay instance not initialized");

  return instance.orders.create({
    amount: Math.round(amount * 100),
    currency,
    receipt: receipt || `rcpt_${Date.now()}`,
  });
}

/* ============================================================
   🔏 SIGNATURE VERIFY
============================================================ */
export function verifyPayment({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}: any) {
  const secret = resolveSecret();
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  return expected === razorpay_signature;
}
