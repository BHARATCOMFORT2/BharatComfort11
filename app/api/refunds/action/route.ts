export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";
import { razorpay } from "@/lib/payments-razorpay";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/refunds/action
 * Body: { refundId: string, action: "approve" | "reject" }
 *
 * Rules:
 * - Only admin can approve/reject refunds
 * - Approve: mark refund processed, update linked booking
 * - Reject: mark refund rejected
 * - Optionally triggers Razorpay refund if paymentMode = "razorpay"
 */
export async function POST(req: Request) {
  try {
    // ✅ Authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const role = (decoded as any).role || "user";

    if (role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admins only" },
        { status: 403 }
      );
    }

    const { refundId, action } = await req.json();
    if (!refundId || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400 }
      );
    }

    // ✅ Use Admin SDK methods
    const refundRef = db.collection("refunds").doc(refundId);
    const refundSnap = await refundRef.get();

    if (!refundSnap.exists) {
      return NextResponse.json({ error: "Refund not found" }, { status: 404 });
    }

    const refundData = refundSnap.data();
    if (!refundData) {
      return NextResponse.json(
        { error: "Refund data missing" },
        { status: 404 }
      );
    }

    const bookingId = refundData.bookingId;
    const bookingRef = db.collection("bookings").doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingSnap.data();

    // ✅ Approve refund
    if (action === "approve") {
      console.log("Approving refund:", refundId);

      // Optional Razorpay refund trigger
      if (refundData.paymentMode === "razorpay" && refundData.amount > 0) {
        try {
          const paymentId = booking?.razorpayPaymentId;
          if (razorpay && paymentId) {
            await razorpay.payments.refund(paymentId, {
              amount: Math.round(refundData.amount * 100),
              speed: "optimum",
            });
            console.log("✅ Razorpay refund processed for:", paymentId);
          } else {
            console.warn("⚠️ Razorpay refund skipped (no paymentId)");
          }
        } catch (err) {
          console.error("❌ Razorpay refund failed:", err);
        }
      }

      // Update refund + booking
      await refundRef.update({
        refundStatus: "processed",
        processedAt: FieldValue.serverTimestamp(),
        processedBy: decoded.email || "system@bharatcomfort11",
      });

      await bookingRef.update({
        status: "cancelled_by_user",
        refundStatus: "processed",
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Email user
      try {
        const userEmail = booking?.userEmail || "";
        if (userEmail) {
          await sendEmail(
            userEmail,
            "BHARATCOMFORT11 — Refund Processed",
            `
              <p>Hi,</p>
              <p>Your refund for booking <b>${bookingId}</b> has been processed successfully.</p>
              <p>Amount Refunded: ₹${refundData.amount}</p>
              <p>Thank you for choosing BharatComfort11!</p>
            `
          );
        }
      } catch (e) {
        console.warn("Email send failed:", e);
      }

      return NextResponse.json({
        success: true,
        message: "Refund approved and processed successfully.",
      });
    }

    // ✅ Reject refund
    if (action === "reject") {
      await refundRef.update({
        refundStatus: "rejected",
        processedAt: FieldValue.serverTimestamp(),
        processedBy: decoded.email || "system@bharatcomfort11",
      });

      await bookingRef.update({
        refundStatus: "rejected",
        updatedAt: FieldValue.serverTimestamp(),
      });

      try {
        const userEmail = booking?.userEmail || "";
        if (userEmail) {
          await sendEmail(
            userEmail,
            "BHARATCOMFORT11 — Refund Rejected",
            `
              <p>Hi,</p>
              <p>Your refund request for booking <b>${bookingId}</b> was reviewed and could not be approved.</p>
              <p>If you believe this is an error, please contact support.</p>
            `
          );
        }
      } catch (e) {
        console.warn("Email send failed:", e);
      }

      return NextResponse.json({
        success: true,
        message: "Refund rejected successfully.",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Refund action error:", error);
    return NextResponse.json(
      { error: "Failed to process refund action" },
      { status: 500 }
    );
  }
}
