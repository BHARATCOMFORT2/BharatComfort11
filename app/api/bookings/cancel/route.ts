// app/api/bookings/cancel/route.ts
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
import { sendEmail } from "@/lib/email"; // optional: comment out if not using email

/**
 * POST /api/bookings/cancel
 * Body: { bookingId: string, reason?: string }
 *
 * Rules:
 * - User must own the booking
 * - If paymentMode="razorpay":
 *    * Allowed only if check-in is >= 24h from now
 *    * Creates a refund record (refunds collection)
 *    * booking.status -> "cancel_requested" (admin/finance will finalize -> "cancelled_by_user")
 * - If paymentMode in ["pay_at_hotel","pay_at_restaurant"]:
 *    * No refund record (no prepayment)
 *    * booking.status -> "cancelled_unpaid" immediately
 */

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

    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingSnap.data();

    // Ownership check
    if (booking.userId !== uid) {
      return NextResponse.json({ error: "Forbidden: not your booking" }, { status: 403 });
    }

    const paymentMode = booking.paymentMode || "razorpay"; // default legacy
    const status = booking.status || "";
    const paymentStatus = booking.paymentStatus || "";

    // Normalize check-in to Date
    const checkIn = new Date(booking.checkIn);
    if (isNaN(checkIn.getTime())) {
      return NextResponse.json({ error: "Invalid check-in date on booking" }, { status: 400 });
    }

    const now = new Date();
    const diffHours = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Branch by payment mode
    if (paymentMode === "razorpay") {
      // Must be a confirmed paid booking
      if (!(status === "confirmed" && paymentStatus === "paid")) {
        return NextResponse.json(
          { error: "Only confirmed & paid bookings can be cancelled for refund" },
          { status: 400 }
        );
      }

      // 24-hour rule
      if (diffHours < 24) {
        return NextResponse.json(
          { error: "Cancellations allowed only before 24 hours of check-in" },
          { status: 403 }
        );
      }

      // Mark booking as cancel requested (finance will approve/process refund)
      await updateDoc(bookingRef, {
        status: "cancel_requested",
        refundStatus: "pending",
        cancelReason: reason,
        cancelRequestedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create refund record
      const refundsRef = collection(db, "refunds");
      const refundDoc = await addDoc(refundsRef, {
        bookingId,
        userId: uid,
        partnerId: booking.partnerId || null,
        amount: booking.amount || 0,
        paymentMode: "razorpay",
        refundMode: "original", // or "bank/upi" if you want to force manual — adjust as needed
        refundStatus: "pending", // pending -> approved -> processed
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        notes: reason,
      });

      // Optional emails (safe to keep; comment out if not configured)
      try {
        const userEmail = booking.userEmail || decoded.email || "";
        if (userEmail) {
          await sendEmail(
            userEmail,
            "BHARATCOMFORT11 — Cancellation Received",
            `
              <p>Hi,</p>
              <p>Your cancellation request for booking <b>${bookingId}</b> has been received.</p>
              <p>Full refund will be processed since it's ≥24h before check-in.</p>
              <p>Refund ID: <b>${refundDoc.id}</b></p>
              <p>We will notify you once processed.</p>
            `
          );
        }
        const partnerEmail = booking.partnerEmail || "";
        if (partnerEmail) {
          await sendEmail(
            partnerEmail,
            "BHARATCOMFORT11 — Booking Cancelled by User",
            `
              <p>Booking <b>${bookingId}</b> has been cancelled by the user.</p>
              <p>Please update availability accordingly.</p>
            `
          );
        }
      } catch (e) {
        // Non-fatal
        console.warn("Email send failed:", e);
      }

      return NextResponse.json({
        success: true,
        message: "Cancellation requested. Full refund will be processed.",
        refundCreated: true,
      });
    }

    // Pay at Hotel / Restaurant (no prepaid amount)
    // Allow cancellation anytime, no refund record
    if (status !== "confirmed_unpaid" && status !== "confirmed") {
      // In case legacy unpaid confirmations used "confirmed"
      return NextResponse.json(
        { error: "Only active unpaid bookings can be cancelled" },
        { status: 400 }
      );
    }

    await updateDoc(bookingRef, {
      status: "cancelled_unpaid",
      cancelReason: reason,
      cancelRequestedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Optional email for user (no refund)
    try {
      const userEmail = booking.userEmail || decoded.email || "";
      if (userEmail) {
        await sendEmail(
          userEmail,
          "BHARATCOMFORT11 — Booking Cancelled",
          `
            <p>Hi,</p>
            <p>Your booking <b>${bookingId}</b> has been cancelled successfully.</p>
            <p>No refund applies for Pay-at-Hotel/Restaurant bookings.</p>
          `
        );
      }
    } catch (e) {
      console.warn("Email send failed:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Unpaid booking cancelled successfully. No refund applicable.",
      refundCreated: false,
    });
  } catch (error) {
    console.error("Cancel booking error:", error);
    return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
  }
}
