// lib/payments/providers/razorpay.ts
import Razorpay from "razorpay";
import crypto from "crypto";
import {
  PaymentProvider,
  CreateArgs,
  CreateResult,
  VerifyArgs,
  VerifyResult,
  CheckoutClientOptions,
  registerProvider,
} from "@/lib/payments/core";

let instance: Razorpay | null = null;

/** 🔐 Resolve Razorpay secret properly */
function resolveSecret(): string | null {
  const raw = process.env.RAZORPAY_KEY_SECRET?.trim();
  const encoded = process.env.RAZORPAY_KEY_SECRET_BASE64?.trim();

  if (raw) return raw;

  if (encoded) {
    try {
      return Buffer.from(encoded, "base64").toString("utf8").trim();
    } catch (err) {
      console.error("❌ Failed to decode Razorpay secret:", err);
    }
  }

  console.error("❌ Missing Razorpay secret");
  return null;
}

/** 🚀 Get server Razorpay instance (safe, stable) */
function getServer(): Razorpay {
  if (instance) return instance;

  const key_id = process.env.RAZORPAY_KEY_ID?.trim();
  const key_secret = resolveSecret();

  if (!key_id || !key_secret) {
    console.error("❌ Razorpay keys missing in server environment");
    throw new Error("Razorpay environment keys missing");
  }

  instance = new Razorpay({ key_id, key_secret });
  console.log("✅ Razorpay instance initialized (provider)");
  return instance;
}

/** 🔌 Provider Implementation */
export const RazorpayProvider: PaymentProvider = {
  name: "razorpay",

  // Create Razorpay Order
  async createOrder({ amount, currency = "INR", receipt, meta }: CreateArgs) {
    const server = getServer();

    const order = await server.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt: receipt || `rcpt_${meta?.context || "general"}_${Date.now()}`,
    });

    return {
      ok: true,
      provider: "razorpay",
      orderId: order.id,
      amountMinor: order.amount,
      currency: order.currency,
    } as CreateResult;
  },

  // Verify Payment Signature
  async verify({ payload }: VerifyArgs): Promise<VerifyResult> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return { ok: false, error: "Missing Razorpay fields" };

    const secret = resolveSecret();
    if (!secret) return { ok: false, error: "Missing Razorpay secret" };

    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature)
      return { ok: false, error: "Invalid Razorpay signature" };

    return { ok: true, orderId: razorpay_order_id, paymentId: razorpay_payment_id };
  },

  // Client Checkout
  openCheckout(opts: CheckoutClientOptions) {
    if (typeof window === "undefined") return;

    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key) {
      opts.onFailure({ error: "Razorpay public key missing" });
      return;
    }

    const options = {
      key,
      amount: Math.round(opts.amount * 100),
      currency: opts.currency,
      order_id: opts.orderId,
      name: opts.name,
      prefill: { email: opts.email, contact: opts.phone || "" },
      theme: { color: "#2563eb" },
      handler: (res: any) => opts.onSuccess(res),
      modal: { ondismiss: () => opts.onFailure({ error: "Payment cancelled" }) },
    };

    new (window as any).Razorpay(options).open();
  },
};

// Register globally
registerProvider(RazorpayProvider);
