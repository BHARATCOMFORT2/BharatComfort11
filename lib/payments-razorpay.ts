import Razorpay from "razorpay";

export const razorpay: Razorpay | null =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null;

export async function createOrder(amount: number, currency: string) {
  if (!razorpay) {
    throw new Error("Razorpay not configured"); // ✅ runtime check
  }

  // TypeScript now knows razorpay is not null
  const order = await razorpay.orders.create({
    amount,
    currency,
  });

  return order;
}
