export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import "server-only";

import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import { sendEmail } from "@/lib/email";
// ❌ removed: import { uploadInvoiceToFirebase } from "@/lib/storage/uploadInvoice";
import { pushInvoiceNotification } from "@/lib/notifications/pushInvoiceNotification";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const { bookingId, reason = "User requested cancellation" } = await req.json();
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    // Admin SDK Firestore
    const bookingRef = db.collection("bookings").doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingSnap.data() as any;
    if (booking.userId !== uid) {
      return NextResponse.json({ error: "Forbidden: not your booking" }, { status: 403 });
    }

    const paymentMode = booking.paymentMode || "razorpay";
    const status = booking.status || "";
    const paymentStatus = booking.paymentStatus || "";
    const checkIn = new Date(booking.checkIn);
    const diffHours = (checkIn.getTime() - Date.now()) / (1000 * 60 * 60);

    // Razorpay paid bookings — eligible for refund
    if (paymentMode === "razorpay") {
      if (!(status === "confirmed" && paymentStatus === "paid")) {
        return NextResponse.json(
          { error: "Only confirmed & paid bookings can be cancelled for refund" },
          { status: 400 }
        );
      }

      if (diffHours < 24) {
        return NextResponse.json(
          { error: "Cancellations allowed only before 24 hours of check-in" },
          { status: 403 }
        );
      }

      await bookingRef.update({
        status: "cancel_requested",
        refundStatus: "pending",
        cancelReason: reason,
        cancelRequestedAt: new Date(),
        updatedAt: new Date(),
      });

      // Create refund record
      const refundRef = db.collection("refunds").doc();
      const refundAmount = Number(booking.amount) || 0;

      await refundRef.set({
        id: refundRef.id,
        bookingId,
        userId: uid,
        partnerId: booking.partnerId || null,
        amount: refundAmount,
        paymentMode: "razorpay",
        refundMode: "original",
        refundStatus: "processed",
        createdAt: new Date(),
        processedAt: new Date(),
        notes: reason,
      });

      // Generate refund invoice → treat return value as URL (since previous type implied void for buffer)
      const { generateRefundInvoice } = await import("@/lib/invoices/generateRefundInvoice");
      const invoiceUrlMaybe = await generateRefundInvoice({
        refundId: refundRef.id,
        bookingId,
        userId: uid,
        amount: refundAmount,
        mode: "razorpay",
        reason,
      });

      // If your generator returns a URL, use it; otherwise keep empty string (no crash)
      const invoiceId = `INV-RF-${Date.now()}`;
      const invoiceUrl = typeof invoiceUrlMaybe === "string" ? invoiceUrlMaybe : "";

      await refundRef.update({
        invoiceId,
        invoiceUrl,
        invoiceGeneratedAt: new Date(),
      });

      // Email (best-effort)
      try {
        const userEmail = booking.userEmail || decoded.email || "";
        if (userEmail) {
          await sendEmail(
            userEmail,
            `BHARATCOMFORT11 — Refund Processed for Booking ${bookingId}`,
            `
              <p>Hi ${booking.userName || "User"},</p>
              <p>Your refund for booking <b>${bookingId}</b> has been processed successfully.</p>
              <p>Amount Refunded: ₹${refundAmount}</p>
              ${
                invoiceUrl
                  ? `<p>You can download your refund invoice here:</p>
                     <p><a href="${invoiceUrl}" target="_blank" rel="noopener noreferrer">${invoiceUrl}</a></p>`
                  : `<p>The refund invoice will be available in your account shortly.</p>`
              }
              <p>Thank you for using BharatComfort11.</p>
            `
          );
        }
      } catch (e) {
        console.warn("⚠️ Refund email failed:", e);
      }

      // Admin notification
      await pushInvoiceNotification({
        type: "refund",
        invoiceId,
        invoiceUrl,
        userId: uid,
        amount: refundAmount,
        relatedId: bookingId,
      });

      return NextResponse.json({
        success: true,
        message: "Refund processed and invoice generated.",
        refundId: refundRef.id,
        invoiceUrl,
      });
    }

    // Pay-at-hotel / restaurant — cancel only
    if (status === "confirmed" || status === "confirmed_unpaid") {
      await bookingRef.update({
        status: "cancelled_unpaid",
        cancelReason: reason,
        cancelRequestedAt: new Date(),
        updatedAt: new Date(),
      });

      try {
        const userEmail = booking.userEmail || decoded.email || "";
        if (userEmail) {
          await sendEmail(
            userEmail,
            "BHARATCOMFORT11 — Booking Cancelled (No Refund)",
            `
              <p>Hi ${booking.userName || "User"},</p>
              <p>Your booking <b>${bookingId}</b> has been cancelled successfully.</p>
              <p>No refund applies as this was a pay-at-hotel/restaurant booking.</p>
            `
          );
        }
      } catch (e) {
        console.warn("⚠️ Unpaid cancel email failed:", e);
      }

      return NextResponse.json({
        success: true,
        message: "Unpaid booking cancelled successfully. No refund applicable.",
        refundCreated: false,
      });
    }

    return NextResponse.json(
      { error: "Invalid booking status for cancellation" },
      { status: 400 }
    );
  } catch (error) {
    console.error("❌ Cancel booking error:", error);
    return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
  }
}
