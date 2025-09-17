import Razorpay from "razorpay";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});
async function createOrder(options: any) {
}

export { createOrder };

export async function createRazorpayOrder(amount: number, currency = "INR") {
  const options = {
    amount: amount * 100, // smallest currency unit (paise)
    currency,
    payment_capture: 1,
  };
  return await razorpay.orders.create(options);
}
