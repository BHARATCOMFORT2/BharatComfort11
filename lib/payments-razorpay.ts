// lib/payments-razorpay.ts
import Razorpay from "razorpay";

// ================== SERVER-SIDE ==================
export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

interface CreateOrderInput {
  amount: number; // in INR
  currency?: string;
}

/**
 * Create Razorpay order (server-side)
 */
export async function createOrder({ amount, currency = "INR" }: CreateOrderInput) {
  return await razorpay.orders.create({
    amount: amount * 100, // convert to paise
    currency,
  });
}

// ================== CLIENT-SIDE ==================
interface OpenCheckoutInput {
  amount: number; // in INR
  orderId: string;
  name: string;
  email: string;
  phone?: string;
  onSuccess?: (response: any) => void;
  onFailure?: (response: any) => void;
}

/**
 * Open Razorpay Checkout (client-side)
 */
export function openRazorpayCheckout({
  amount,
  orderId,
  name,
  email,
  phone = "",
  onSuccess,
  onFailure,
}: OpenCheckoutInput) {
  if (typeof window === "undefined") return;

  const options: any = {
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY, // ✅ must be exposed in env
    amount: amount * 100,
    currency: "INR",
    order_id: orderId,
    name,
    prefill: { email, contact: phone },
    theme: { color: "#6366f1" },
    handler: (response: any) => {
      if (onSuccess) onSuccess(response);
      console.log("Payment success:", response);
    },
    modal: {
      ondismiss: () => {
        if (onFailure) onFailure({ error: "Payment popup closed." });
      },
    },
  };

  const rzp = new (window as any).Razorpay(options);
  rzp.open();
}
