"use client";

/* ============================================================
   🪄 OPEN CHECKOUT
============================================================ */
export function openRazorpayCheckout({
  amount,
  orderId,
  name,
  email,
  phone,
  onSuccess,
  onFailure,
}: {
  amount: number;
  orderId: string;
  name: string;
  email: string;
  phone?: string;
  onSuccess?: (res: any) => void;
  onFailure?: (err: any) => void;
}) {
  if (typeof window === "undefined") return;

  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!key) {
    console.error("❌ NEXT_PUBLIC_RAZORPAY_KEY_ID not set");
    return;
  }

  const options: any = {
    key,
    amount: Math.round(amount * 100),
    currency: "INR",
    order_id: orderId,
    name,
    prefill: {
      email,
      contact: phone || "",
    },
    theme: { color: "#f59e0b" },
    handler: (response: any) => onSuccess?.(response),
    modal: {
      ondismiss: () => onFailure?.({ error: "Payment cancelled" }),
    },
  };

  try {
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  } catch (err) {
    console.error("❌ Razorpay Checkout Error:", err);
    onFailure?.(err);
  }
}
