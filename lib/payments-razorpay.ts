import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Match the SDK type (allow string | number)
export interface RazorpayOrder {
  id: string;
  amount: number | string;
  currency: string;
  status: string;
}

export async function createOrder(
  amount: number,
  currency: string
): Promise<RazorpayOrder> {
  const order = await razorpay.orders.create({
    amount,
    currency,
  });

  // Cast amount safely to number (Razorpay uses paise)
  return {
    id: order.id,
    amount: Number(order.amount),
    currency: order.currency,
    status: order.status,
  };
}
