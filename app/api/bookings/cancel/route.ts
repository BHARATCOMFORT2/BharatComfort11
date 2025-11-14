export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import "server-only";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { sendEmail } from "@/lib/email";
import { pushInvoiceNotification } from "@/lib/notifications/pushInvoiceNotification";

export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb, admin } = getFirebaseAdmin();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "").trim();
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const { bookingId, reason = "User requested cancellation" } =
      await req.json();
    if (!bookingId)
      return NextResponse.json(
        { error: "bookingId is required" },
        { status: 400 }
      );

    const bookingRef = adminDb.collection("bookings").doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists)
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );

    const booking = bookingSnap.data() as any;

    // User security check
    if (booking.userId !== uid)
      return NextResponse.json(
        { error: "Forbidden: not your booking" },
        { status: 403 }
      );

    const paymentMode = booking.paymentMode || "razorpay";
    const bookingStatus = booking.status || "";
    const paymentStatus = booking.paymentStatus || "";
    const checkIn = new Date(booking.checkIn);

    const diffHours = (checkIn.getTime() - Date.now()) / (1000 * 60 * 60);

    /* --------------------------------------------------------------------------
       🔥 Case 1: Razorpay PAID Booking — Eligible for Refund
    -------------------------------------------------------------------------- */
    if (paymentMode === "razorpay") {
      if (!(bookingStatus === "confirmed" && paymentStatus === "paid")) {
        return NextResponse.json(
          {
            error:
              "Only confirmed & paid bookings can be cancelled for refund",
          },
          { status: 400 }
        );
      }

      if (diffHours < 24) {
        return NextResponse.json(
          {
            error:
              "Cancellations allowed only before 24 hours of check-in",
          },
          { status: 403 }
        );
      }

      await bookingRef.update({
        status: "cancel_requested",
        refundStatus: "pending",
        cancelReason: reason,
        cancelRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      /* ---------------------------------------------------
         Create Refund Record
      --------------------------------------------------- */
      const refundRef = adminDb.collection("refunds").doc();
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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        notes: reason,
      });

      /* ---------------------------------------------------
         Generate Refund Invoice (URL OR void-safe)
      --------------------------------------------------- */
      const { generateRefundInvoice } = await import(
        "@/lib/invoices/generateRefundInvoice"
      );

      const possibleUrl = await generateRefundInvoice({
        refundId: refundRef.id,
        bookingId,
        userId: uid,
        amount: refundAmount,
        mode: "razorpay",
        reason,
      });

      const invoiceId = `INV-RF-${Date.now()}`;
      const invoiceUrl =
        typeof possibleUrl === "string" ? possibleUrl : "";

      await refundRef.update({
        invoiceId,
        invoiceUrl,
        invoiceGeneratedAt:
          admin.firestore.FieldValue.serverTimestamp(),
      });

      /* ---------------------------------------------------
         Email (best-effort)
      --------------------------------------------------- */
      try {
        const userEmail = booking.userEmail || decoded.email || "";
        if (userEmail) {
          await sendEmail(
            userEmail,
            `BHARATCOMFORT11 — Refund Processed for Booking ${bookingId}`,
            `
            <p>Hi ${booking.userName || "User"},</p>
            <p>Your refund for booking <b>${bookingId}</b> has been processed.</p>
            <p>Amount Refunded: ₹${refundAmount}</p>
            ${
              invoiceUrl
                ? `<p><a href="${invoiceUrl}" target="_blank">Download Refund Invoice</a></p>`
                : `<p>Your invoice will be available shortly.</p>`
            }
          `
          );
        }
      } catch (emailErr) {
        console.warn("⚠️ Refund email failed:", emailErr);
      }

      /* ---------------------------------------------------
         Admin Notification
      --------------------------------------------------- */
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
        message: "Refund processed.",
        refundId: refundRef.id,
        invoiceUrl,
      });
    }

    /* --------------------------------------------------------------------------
       🔥 Case 2: Pay-at-Hotel / Restaurant → No Refund
    -------------------------------------------------------------------------- */
    if (
      bookingStatus === "confirmed" ||
      bookingStatus === "confirmed_unpaid"
    ) {
      await bookingRef.update({
        status: "cancelled_unpaid",
        cancelReason: reason,
        cancelRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      try {
        const userEmail = booking.userEmail || decoded.email || "";
        if (userEmail) {
          await sendEmail(
            userEmail,
            "BHARATCOMFORT11 — Booking Cancelled (No Refund)",
            `
            <p>Hi ${booking.userName || "User"},</p>
            <p>Your booking <b>${bookingId}</b> has been cancelled.</p>
            <p>No refund applies for pay-at-property bookings.</p>
          `
          );
        }
      } catch (err) {
        console.warn("⚠️ Cancel email failed:", err);
      }

      return NextResponse.json({
        success: true,
        message: "Unpaid booking cancelled.",
        refundCreated: false,
      });
    }

    /* --------------------------------------------------------------------------
       ❌ Invalid cancellation state
    -------------------------------------------------------------------------- */
    return NextResponse.json(
      { error: "Invalid booking status for cancellation" },
      { status: 400 }
    );
  } catch (error) {
    console.error("❌ Cancel booking error:", error);
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 }
    );
  }
}
