import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { sendEmail } from "@/lib/email";
import { generateRefundInvoice } from "@/lib/invoices/generateRefundInvoice";
import { uploadInvoiceToFirebase } from "@/lib/storage/uploadInvoice";
import { pushInvoiceNotification } from "@/lib/notifications/pushInvoiceNotification";

/**
 * POST /api/bookings/cancel
 * Body: { bookingId: string, reason?: string }
 *
 * - Razorpay bookings: auto refund + refund invoice + email
 * - Pay-at-Hotel/Restaurant: immediate cancel (no refund)
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const { bookingId, reason = "User requested cancellation" } = await req.json();
    if (!bookingId)
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });

    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists())
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const booking = bookingSnap.data();
    if (booking.userId !== uid)
      return NextResponse.json({ error: "Forbidden: not your booking" }, { status: 403 });

    const paymentMode = booking.paymentMode || "razorpay";
    const status = booking.status || "";
    const paymentStatus = booking.paymentStatus || "";
    const checkIn = new Date(booking.checkIn);
    const diffHours = (checkIn.getTime() - Date.now()) / (1000 * 60 * 60);

    // 🔹 Razorpay paid bookings — eligible for refund
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

      await updateDoc(bookingRef, {
        status: "cancel_requested",
        refundStatus: "pending",
        cancelReason: reason,
        cancelRequestedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 🔸 Create refund record
      const refundsRef = collection(db, "refunds");
      const refundDoc = await addDoc(refundsRef, {
        bookingId,
        userId: uid,
        partnerId: booking.partnerId || null,
        amount: booking.amount || 0,
        paymentMode: "razorpay",
        refundMode: "original",
        refundStatus: "processed",
        createdAt: serverTimestamp(),
        processedAt: serverTimestamp(),
        notes: reason,
      });

      // 🔸 Generate refund invoice
      const invoiceId = `INV-RF-${Date.now()}`;
      const pdfBuffer = await generateRefundInvoice({
        refundId: refundDoc.id,
        bookingId,
        invoiceId,
        userName: booking.userName || decoded.name || "User",
        userEmail: booking.userEmail || decoded.email || "",
        amount: booking.amount,
        paymentMode: "razorpay",
        reason,
        createdAt: new Date(),
      });

      // 🔸 Upload invoice PDF
      const invoiceUrl = await uploadInvoiceToFirebase(pdfBuffer, invoiceId, "refund");

      // 🔸 Save invoice details in refund doc
      await updateDoc(refundDoc, {
        invoiceId,
        invoiceUrl,
        invoiceGeneratedAt: serverTimestamp(),
      });

      // 🔸 Send refund confirmation email
      try {
        const userEmail = booking.userEmail || decoded.email || "";
        if (userEmail) {
          await sendEmail(
            userEmail,
            `BHARATCOMFORT11 — Refund Processed for Booking ${bookingId}`,
            `
              <p>Hi ${booking.userName || "User"},</p>
              <p>Your refund for booking <b>${bookingId}</b> has been processed successfully.</p>
              <p>Amount Refunded: ₹${booking.amount}</p>
              <p>You can download your refund invoice here:</p>
              <p><a href="${invoiceUrl}" target="_blank">${invoiceUrl}</a></p>
              <p>Thank you for using BharatComfort11.</p>
            `
          );
        }
      } catch (e) {
        console.warn("⚠️ Refund email failed:", e);
      }

      // 🔸 Push admin notification
      await pushInvoiceNotification({
        type: "refund",
        invoiceId,
        invoiceUrl,
        userId: uid,
        amount: booking.amount,
        relatedId: bookingId,
      });

      return NextResponse.json({
        success: true,
        message: "Refund processed and invoice generated.",
        refundId: refundDoc.id,
        invoiceUrl,
      });
    }

    // 🔹 Pay-at-hotel / restaurant — cancel only
    if (status === "confirmed" || status === "confirmed_unpaid") {
      await updateDoc(bookingRef, {
        status: "cancelled_unpaid",
        cancelReason: reason,
        cancelRequestedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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
