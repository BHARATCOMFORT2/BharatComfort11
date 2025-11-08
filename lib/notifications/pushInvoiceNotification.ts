import { db } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Pushes an admin-facing notification when an invoice is generated.
 * Supports both booking & refund invoice events.
 */
export async function pushInvoiceNotification(params: {
  type: "booking" | "refund";
  invoiceId: string;
  invoiceUrl: string;
  userId: string;
  amount: number;
  relatedId: string; // bookingId for booking invoices, refundId or bookingId for refunds
}) {
  const { type, invoiceId, invoiceUrl, userId, amount, relatedId } = params;

  try {
    await db.collection("notifications").add({
      kind: "invoice",
      audience: "admin", // for admin dashboard filtering
      type, // booking | refund
      title:
        type === "booking"
          ? "Booking Invoice Generated"
          : "Refund Invoice Generated",
      message:
        type === "booking"
          ? `Invoice ${invoiceId} created for Booking ${relatedId} (₹${amount}).`
          : `Refund Invoice ${invoiceId} created for Booking ${relatedId} (₹${amount}).`,
      meta: {
        invoiceId,
        invoiceUrl,
        userId,
        amount,
        relatedId,
      },
      read: false,
      createdAt: FieldValue.serverTimestamp(),
      priority: "normal", // "normal" | "high"
    });

    console.log(`✅ Admin invoice notification pushed for ${type} ${invoiceId}`);
  } catch (e) {
    console.warn("⚠️ Failed to push admin invoice notification:", (e as Error).message);
  }
}
