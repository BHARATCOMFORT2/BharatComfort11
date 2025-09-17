// lib/payments-razorpay.ts
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function createOrder(options: {
  amount: number;
  currency: string;
  receipt: string;
}) {
  try {
    const order = await razorpay.orders.create(options);
    return order; // ✅ return the order object
  } catch (error) {
    console.error("Razorpay order creation failed:", error);
    throw error;
  }
}
