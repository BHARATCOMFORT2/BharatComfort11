// lib/payments-razorpay.ts
import Razorpay from "razorpay";
import crypto from "crypto";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// ✅ Create a new Razorpay order
export async function createOrder(amount: number) {
  const options = {
    amount: amount * 100,
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
  };
  return await razorpay.orders.create(options);
}

// ✅ Fetch invoices
export async function fetchInvoices() {
  return await razorpay.invoices.all({ count: 10 });
}

// ✅ Verify webhook signature
export function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return expected === signature;
}
