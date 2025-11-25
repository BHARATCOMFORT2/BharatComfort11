export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { wrapRoute } from "@/lib/universal-wrapper";
import { createOrder as createRzpOrder } from "@/lib/payments-razorpay"; // server-safe
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST: Create Razorpay Order (Hybrid Mode)
 *
 * Body:
 * {
 *   listingId,
 *   partnerId,
 *   amount,
 *   checkIn,
 *   checkOut,
 *   paymentMode? = "razorpay" | "pay_at_hotel"
 * }
 *
 * Behavior:
 * - If listing.allowPayAtHotel === true and paymentMode === "pay_at_hotel":
 *     -> create booking immediately (no Razorpay)
 * - Else:
 *     -> create Razorpay order via server SDK
 *     -> create a payment-intent document in `payments` collection (status: "created")
 *     -> return razorpayOrderId + NEXT_PUBLIC_RAZORPAY_KEY_ID
 */
export const POST = wrapRoute(
  async (req, ctx) => {
    const { adminDb, uid: userId } = ctx;

    const body = await req.json().catch(() => ({}));
    const {
      listingId,
      partnerId,
      amount,
      checkIn,
      checkOut,
      paymentMode = "razorpay",
    } = body;

    if (!listingId || !partnerId || !amount || !checkIn || !checkOut) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Load listing to check pay-at-hotel flag and other validations
    const listingRef = adminDb.collection("listings").doc(listingId);
    const listingSnap = await listingRef.get();
    if (!listingSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Listing not found" },
        { status: 404 }
      );
    }
    const listing = listingSnap.data() || {};
    const allowPayAtHotel = !!listing.allowPayAtHotel;

    // PAY-AT-HOTEL flow -> immediate booking
    if (paymentMode === "pay_at_hotel" && allowPayAtHotel) {
      const now = FieldValue.serverTimestamp();
      const bookingData = {
        userId,
        userEmail: ctx.decoded?.email || null,
        partnerId,
        listingId,
        amount: Number(amount),
        checkIn,
        checkOut,
        paymentMode: "pay_at_hotel",
        paymentStatus: "unpaid",
        status: "confirmed_unpaid",
        refundStatus: "none",
        razorpayOrderId: null,
        createdAt: now,
        updatedAt: now,
      };

      const bookingRef = await adminDb.collection("bookings").add(bookingData);
      const bookingId = bookingRef.id;

      // optional: generate invoice for pay-at-hotel (unpaid)
      try {
        const invoicePdf = await import("@/lib/invoices/generateBookingInvoice").then(m => m.generateBookingInvoice).then(fn => fn({
          bookingId,
          userId,
          paymentId: `PAYLATER-${bookingId}`,
          amount: Number(amount),
        }));

        const invoiceUrl = typeof invoicePdf === "string"
          ? invoicePdf
          : await import("@/lib/storage/uploadInvoice").then(m => m.uploadInvoiceToFirebase).then(fn => fn(invoicePdf, `INV-${bookingId}`, "booking"));

        await adminDb.collection("invoices").add({
          bookingId,
          userId,
          partnerId,
          amount: Number(amount),
          paymentMode: "pay_at_hotel",
          status: "unpaid",
          invoiceUrl,
          createdAt: now,
        });
      } catch (e) {
        console.warn("Invoice generation failed (pay_at_hotel):", e);
      }

      return NextResponse.json({
        success: true,
        bookingId,
        paymentMode: "pay_at_hotel",
        message: "Booking created for pay-at-hotel",
      });
    }

    // Otherwise -> create Razorpay order and a payment-intent
    try {
      // Create Razorpay order (server-side)
      const rzpOrder = await createRzpOrder({
        amount: Number(amount),
        currency: "INR",
        receipt: `intent_${Date.now()}_${Math.floor(Math.random() * 999999)}`,
      });

      if (!rzpOrder || !rzpOrder.id) {
        throw new Error("Razorpay order creation failed");
      }

      // Save payment-intent metadata in payments collection
      const paymentDoc = {
        status: "created",
        razorpayOrderId: rzpOrder.id,
        amount: Number(amount),
        currency: "INR",
        userId,
        partnerId,
        listingId,
        checkIn,
        checkOut,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await adminDb.collection("payments").doc(rzpOrder.id).set(paymentDoc);

      return NextResponse.json({
        success: true,
        razorpayOrder: rzpOrder,
        razorpayKey: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      });
    } catch (err: any) {
      console.error("create-order error:", err);
      return NextResponse.json(
        { success: false, error: err.message || "Failed to create order" },
        { status: 500 }
      );
    }
  },
  { requireAuth: true }
);
