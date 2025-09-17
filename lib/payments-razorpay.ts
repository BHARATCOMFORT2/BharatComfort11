import Razorpay from "razorpay";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

/**
 * Create a Razorpay order
 * @param amount Amount in INR (without paise, e.g., 500 for ₹500)
 * @param currency Currency code (default "INR")
 */
export async function createRazorpayOrder(amount: number, currency: string = "INR") {
  const options = {
    amount: amount * 100, // Razorpay needs amount in paise
    currency,
    receipt: `rcpt_${Date.now()}`,
  };

  const order = await razorpay.orders.create(options);
  return order;
}
