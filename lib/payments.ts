import Razorpay from "razorpay";

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("Missing Razorpay environment variables");
}

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

/**
 * Create a new Razorpay order
 */
export async function createOrder(amount: number, currency = "INR") {
  const options = {
    amount: amount * 100, // convert to paise
    currency,
    payment_capture: 1,
  };
  return razorpay.orders.create(options);
}
