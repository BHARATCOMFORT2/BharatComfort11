import { db } from "@/lib/firebaseadmin";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Pushes an admin-facing notification when an invoice is generated.
 * type: "booking" | "refund"
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
    await addDoc(collection(db, "notifications"), {
      kind: "invoice",
      audience: "admin",            // filter admin view: where("audience", "==", "admin")
      type,                         // booking | refund
      title:
        type === "booking"
          ? "Booking invoice generated"
          : "Refund invoice generated",
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
      createdAt: serverTimestamp(),
      priority: "normal",           // "normal" | "high"
    });
  } catch (e) {
    console.warn("⚠️ Failed to push admin invoice notification:", e);
  }
}
