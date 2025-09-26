import Razorpay from "razorpay";

// ✅ Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

// ✅ Function to create an order
export async function createOrder(amount: number, currency: string = "INR") {
  const options = {
    amount: amount * 100, // Razorpay accepts in paisa
    currency,
    receipt: `rcpt_${Date.now()}`,
  };

  const order = await razorpay.orders.create(options);
  return order;
}

// ✅ Export both
export default razorpay;
