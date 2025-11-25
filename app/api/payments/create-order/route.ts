// app/api/payments/create-order/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/universal-wrapper";
import { createOrder as createRzpOrder } from "@/lib/payments-razorpay";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST — Create Razorpay Order OR
 * Pay-at-Hotel Booking Generator
 */
export const POST = withAuth(
  async (req, ctx) => {
    const { adminDb, decoded } = ctx;
    const userId = decoded.uid;

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

    // Load listing
    const listingRef = adminDb.collection("listings").doc(listingId);
    const listingSnap = await listingRef.get();

    if (!listingSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Listing not found" },
        { status: 404 }
      );
    }

    const listing = listingSnap.data();
    const allowPayAtHotel = listing.allowPayAtHotel ?? false;

    /* ---------------------------------------------------------
       PAY-AT-HOTEL FLOW
    --------------------------------------------------------- */
    if (paymentMode === "pay_at_hotel" && allowPayAtHotel) {
      const now = FieldValue.serverTimestamp();

      const bookingData = {
        userId,
        userEmail: decoded.email || null,
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

      // Optional invoice generation
      try {
        const invoicePdf = await import("@/lib/invoices/generateBookingInvoice")
          .then((m) => m.generateBookingInvoice)
          .then((fn) =>
            fn({
              bookingId,
              userId,
              paymentId: `PAYLATER-${bookingId}`,
              amount: Number(amount),
            })
          );

        const invoiceUrl =
          typeof invoicePdf === "string"
            ? invoicePdf
            : await import("@/lib/storage/uploadInvoice")
                .then((m) => m.uploadInvoiceToFirebase)
                .then((fn) => fn(invoicePdf, `INV-${bookingId}`, "booking"));

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
        console.warn("Invoice generation failed:", e);
      }

      return NextResponse.json({
        success: true,
        bookingId,
        paymentMode: "pay_at_hotel",
        message: "Booking created for pay-at-hotel",
      });
    }

    /* ---------------------------------------------------------
       RAZORPAY FLOW
    --------------------------------------------------------- */
    try {
      const rzpOrder = await createRzpOrder({
        amount: Number(amount),
        currency: "INR",
        receipt: `intent_${Date.now()}_${Math.floor(Math.random() * 999999)}`,
      });

      if (!rzpOrder?.id) {
        throw new Error("Failed to create Razorpay order");
      }

      // Save payment intent
      await adminDb.collection("payments").doc(rzpOrder.id).set({
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
      });

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
  { requireRole: ["user", "partner", "admin"] }
);
