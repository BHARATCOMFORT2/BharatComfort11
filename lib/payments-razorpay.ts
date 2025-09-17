import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  [key: string]: any; // other Razorpay order properties
}

export async function createOrder(amount: number, currency: string): Promise<RazorpayOrder> {
  const order = await razorpay.orders.create({ amount, currency });
  return order;
}
