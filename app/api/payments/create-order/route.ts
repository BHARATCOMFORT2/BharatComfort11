// app/api/payments/create-order/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/universal-wrapper";
import { createOrder as createRzpOrder } from "@/lib/payments-razorpay";
import { FieldValue } from "firebase-admin/firestore";

/**
 * NEW LOGIC (matches UI):
 *
 * → Booking is already created in /api/bookings
 * → This route ONLY:
 *     - Creates Razorpay order
 *     - Saves payment intent
 *
 * Pay-at-hotel must NOT be handled here anymore.
 */
export const POST = withAuth(
  async (req, ctx) => {
    const { adminDb, decoded } = ctx;
    const userId = decoded.uid;

    const body = await req.json().catch(() => ({}));

    const {
      bookingId,
      amount,
      listingId,
    } = body;

    if (!bookingId || !amount || !listingId) {
      return NextResponse.json(
        { success: false, error: "Missing bookingId, amount, listingId" },
        { status: 400 }
      );
    }

    /* ----------------------------------------------------
       1️⃣ Fetch booking (MUST EXIST)
    ---------------------------------------------------- */
    const bookingSnap = await adminDb.collection("bookings").doc(bookingId).get();

    if (!bookingSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    const booking = bookingSnap.data();
    const partnerId = booking.partnerId;

    /* ----------------------------------------------------
       2️⃣ Create Razorpay order
    ---------------------------------------------------- */
    try {
      const rzpOrder = await createRzpOrder({
        amount: Number(amount),
        currency: "INR",
        receipt: `booking_${bookingId}`,
      });

      if (!rzpOrder?.id) {
        throw new Error("Razorpay order creation failed");
      }

      /* ----------------------------------------------------
         3️⃣ Save payment intent
      ---------------------------------------------------- */
      await adminDb.collection("payments").doc(rzpOrder.id).set({
        status: "created",
        razorpayOrderId: rzpOrder.id,
        bookingId,
        listingId,
        partnerId,
        userId,
        amount: Number(amount),
        currency: "INR",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        razorpayOrder: rzpOrder,
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      });

    } catch (err: any) {
      console.error("Create-order error:", err);
      return NextResponse.json(
        { success: false, error: err.message || "Failed to create Razorpay order" },
        { status: 500 }
      );
    }
  },
  { requireRole: ["user", "partner", "admin"] }
);
