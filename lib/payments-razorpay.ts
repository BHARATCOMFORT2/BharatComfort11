// lib/payments-razorpay.ts
import Razorpay from "razorpay";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

interface CreateOrderInput {
  amount: number;
  currency?: string;
}

export async function createOrder({ amount, currency = "INR" }: CreateOrderInput) {
  return await razorpay.orders.create({
    amount: amount * 100, // ✅ convert to paise
    currency,
  });
}
