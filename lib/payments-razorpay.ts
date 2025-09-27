// lib/payments-razorpay.ts
import Razorpay from "razorpay";

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("Missing Razorpay environment variables");
}

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// helper to create order
export async function createOrder(amount: number) {
  return await razorpay.orders.create({ amount: amount * 100, currency: "INR" });
}
