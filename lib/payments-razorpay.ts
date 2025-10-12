// ================= RAZORPAY LIBRARY =================
import Razorpay from "razorpay";

// ---------------- SERVER-SIDE RAZORPAY INSTANCE ----------------
export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

// ---------------- TYPE DEFINITIONS ----------------
interface CreateOrderInput {
  amount: number; // INR
  currency?: string;
  receipt?: string;
}

interface OpenCheckoutInput {
  amount: number; // INR
  orderId: string;
  name: string;
  email: string;
  phone?: string;
  onSuccess?: (response: any) => void;
  onFailure?: (response: any) => void;
}

// ---------------- SERVER-SIDE: CREATE ORDER ----------------
export async function createOrder({ amount, currency = "INR", receipt }: CreateOrderInput) {
  if (!amount || amount <= 0) throw new Error("Amount must be greater than 0");

  return await razorpay.orders.create({
    amount: Math.round(amount * 100), // convert to paise
    currency,
    receipt: receipt || `rcpt_${Date.now()}`,
  });
}

// ---------------- CLIENT-SIDE: OPEN CHECKOUT ----------------
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

  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
  if (!key) {
    console.error("❌ NEXT_PUBLIC_RAZORPAY_KEY_ID is missing in environment variables");
    if (onFailure) onFailure({ error: "Payment key not configured" });
    return;
  }

  const options: any = {
    key,
    amount: Math.round(amount * 100),
    currency: "INR",
    order_id: orderId,
    name: name || "Booking",
    prefill: { email: email || "", contact: phone || "" },
    theme: { color: "#6366f1" },
    handler: (response: any) => {
      console.log("✅ Payment success:", response);
      if (onSuccess) onSuccess(response);
    },
    modal: {
      ondismiss: () => {
        console.log("⚠️ Payment popup closed");
        if (onFailure) onFailure({ error: "Payment popup closed" });
      },
    },
  };

  try {
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  } catch (err) {
    console.error("❌ Razorpay Checkout error:", err);
    if (onFailure) onFailure({ error: err });
  }
}
