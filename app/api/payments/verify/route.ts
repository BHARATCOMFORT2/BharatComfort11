export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { wrapRoute } from "@/lib/universal-wrapper";
import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";

function resolveRazorpaySecret(): string {
  const plain = process.env.RAZORPAY_KEY_SECRET?.trim();
  const base64 = process.env.RAZORPAY_KEY_SECRET_BASE64?.trim();
  if (plain) return plain;
  if (base64) return Buffer.from(base64, "base64").toString("utf8");
  throw new Error("Missing Razorpay secret");
}

/**
 * POST: Verify payment + create booking
 *
 * Body expected (from client after payment):
 * {
 *   razorpay_order_id,
 *   razorpay_payment_id,
 *   razorpay_signature
 * }
 *
 * Behavior:
 * - Verify HMAC signature.
 * - Lookup payment intent (payments collection doc with id == razorpay_order_id).
 * - If found and not yet completed:
 *     - Create booking using payment-intent meta
 *     - Update payment doc with status=success and payment ids
 *     - Generate invoice, store invoice doc, send email/notification
 */
export const POST = wrapRoute(
  async (req, ctx) => {
    const { adminDb } = ctx;
    const body = await req.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, error: "Missing payment fields" },
        { status: 400 }
      );
    }

    // Verify signature
    try {
      const secret = resolveRazorpaySecret();
      const expected = crypto
        .createHmac("sha256", secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (expected !== razorpay_signature) {
        console.error("Invalid Razorpay signature");
        return NextResponse.json(
          { success: false, error: "Invalid signature" },
          { status: 400 }
        );
      }
    } catch (e: any) {
      console.error("Signature verification failed:", e);
      return NextResponse.json(
        { success: false, error: e.message || "Signature verification failed" },
        { status: 500 }
      );
    }

    // Find payment intent
    const paymentRef = adminDb.collection("payments").doc(razorpay_order_id);
    const paymentSnap = await paymentRef.get();
    if (!paymentSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Payment intent not found" },
        { status: 404 }
      );
    }

    const payment = paymentSnap.data() as any;

    // Already processed?
    if (payment.status === "success" || payment.bookingId) {
      return NextResponse.json({
        success: true,
        message: "Payment already processed",
        bookingId: payment.bookingId || null,
      });
    }

    // Create booking from payment meta
    try {
      const now = FieldValue.serverTimestamp();
      const bookingData: any = {
        userId: payment.userId,
        userEmail: payment.userEmail || ctx.decoded?.email || null,
        partnerId: payment.partnerId,
        listingId: payment.listingId,
        amount: payment.amount,
        checkIn: payment.checkIn,
        checkOut: payment.checkOut,
        paymentMode: "razorpay",
        paymentStatus: "paid",
        status: "confirmed",
        refundStatus: "none",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        createdAt: now,
        updatedAt: now,
      };

      const bookingRef = await adminDb.collection("bookings").add(bookingData);
      const bookingId = bookingRef.id;

      // Update payment doc
      await paymentRef.set(
        {
          status: "success",
          razorpayPaymentId: razorpay_payment_id,
          verifiedAt: now,
          bookingId,
        },
        { merge: true }
      );

      // Generate invoice (using your helper)
      let invoiceUrl = null;
      try {
        const { generateBookingInvoice } = await import("@/lib/invoices/generateBookingInvoice");
        const { uploadInvoiceToFirebase } = await import("@/lib/storage/uploadInvoice");

        const pdf = await generateBookingInvoice({
          bookingId,
          userId: payment.userId,
          paymentId: razorpay_payment_id,
          amount: payment.amount,
        });

        invoiceUrl =
          typeof pdf === "string"
            ? pdf
            : await uploadInvoiceToFirebase(pdf, `INV-${bookingId}`, "booking");

        // store invoice record
        await adminDb.collection("invoices").add({
          type: "booking",
          bookingId,
          userId: payment.userId,
          partnerId: payment.partnerId,
          amount: payment.amount,
          invoiceUrl,
          paymentId: razorpay_payment_id,
          createdAt: now,
        });

        // Send invoice email (best-effort)
        try {
          const { sendInvoiceEmail } = await import("@/lib/emails/sendInvoiceEmail");
          if (payment.userEmail) {
            await sendInvoiceEmail({
              to: payment.userEmail,
              pdfUrl: invoiceUrl,
              invoiceId: `INV-${bookingId}`,
              type: "booking",
              details: {
                name: payment.userName || "Guest",
                bookingId,
                amount: payment.amount,
                date: new Date().toLocaleDateString("en-IN"),
              },
            });
          }
        } catch (e) {
          console.warn("Failed to send invoice email:", e);
        }

        // Push notification (best-effort)
        try {
          const { pushInvoiceNotification } = await import("@/lib/notifications/pushInvoiceNotification");
          await pushInvoiceNotification({
            type: "booking",
            invoiceId: `INV-${bookingId}`,
            invoiceUrl,
            userId: payment.userId,
            amount: payment.amount,
            relatedId: bookingId,
          });
        } catch (e) {
          console.warn("Failed to push invoice notification:", e);
        }
      } catch (e) {
        console.warn("Invoice generation failed:", e);
      }

      return NextResponse.json({
        success: true,
        bookingId,
        paymentId: razorpay_payment_id,
        invoiceUrl,
        message: "Payment verified & booking created",
      });
    } catch (e: any) {
      console.error("Failed to create booking after payment:", e);
      return NextResponse.json(
        { success: false, error: e.message || "Failed to create booking" },
        { status: 500 }
      );
    }
  },
  { requireAuth: false } // client calls this after Razorpay payment; signature verifies authenticity
);
