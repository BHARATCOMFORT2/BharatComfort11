// lib/payments-razorpay.ts
import Razorpay from "razorpay";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

/**
 * Create a new Razorpay order
 * @param amount Amount in rupees (will be converted to paise)
 * @param currency Default: INR
 */
export async function createOrder(amount: number, currency: string = "INR") {
  return await razorpay.orders.create({
    amount: amount * 100, // Razorpay requires paise
    currency,
  });
}
