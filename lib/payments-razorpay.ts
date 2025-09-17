import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});
function createOrder(params: any) {
}

export { createOrder };

export async function createRazorpayOrder(amount: number, currency: string = "INR") {
  const options = {
    amount: amount * 100, // amount in paise
    currency,
    payment_capture: 1,
  };

  const order = await razorpay.orders.create(options);
  return order;
}
