// lib/payments-razorpay.ts
interface OpenCheckoutInput {
  amount: number;
  orderId: string;
  name: string;
  email: string;
  phone?: string;
  onSuccess?: (res: any) => void;
  onFailure?: (err: any) => void;
}

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

  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY;
  if (!key) {
    console.error("❌ NEXT_PUBLIC_RAZORPAY_KEY is missing");
    if (onFailure) onFailure({ error: "Payment key not configured" });
    return;
  }

  const options: any = {
    key,
    amount: Math.round(amount * 100),
    currency: "INR",
    order_id: orderId,
    name: name || "Booking",
    prefill: { email, contact: phone },
    theme: { color: "#6366f1" },
    handler: (response: any) => onSuccess && onSuccess(response),
    modal: {
      ondismiss: () => onFailure && onFailure({ error: "Payment popup closed" }),
    },
  };

  try {
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  } catch (err) {
    console.error("❌ Razorpay checkout error:", err);
    if (onFailure) onFailure({ error: err });
  }
}
