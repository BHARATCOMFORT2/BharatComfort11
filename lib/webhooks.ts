import crypto from "crypto";
import { addNotification } from "@/lib/firestore";

export function verifyWebhookSignature(body: any, signature: string | null) {
  if (!signature) throw new Error("Missing Razorpay signature");

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("Webhook secret not configured");

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(typeof body === "string" ? body : JSON.stringify(body))
    .digest("hex");

  if (signature !== expectedSignature) throw new Error("Invalid signature");

  return true;
}

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
