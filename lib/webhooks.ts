import crypto from "crypto";
import { addNotification } from "@/lib/firestore";

/**
 * ✅ Verify Razorpay webhook signature
 */
export function verifyWebhookSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body) // body must be raw text, not JSON.stringify again
    .digest("hex");

  return signature === expectedSignature;
}

/**
 * ✅ Handle webhook events
 */
export async function handleRazorpayWebhook(body: any) {
  switch (body.event) {
    case "payment.captured":
      await addNotification("Payment captured", body.payload.payment.entity.id);
      break;

    case "payment.failed":
      await addNotification("Payment failed", body.payload.payment.entity.id);
      break;

    case "order.paid":
      await addNotification("Order paid", body.payload.order.entity.id);
      break;

    default:
      console.log(`⚠️ Unhandled event: ${body.event}`);
      break;
  }
}
