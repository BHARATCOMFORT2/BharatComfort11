// app/api/payments/create-order/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/universal-wrapper";
import { createOrder as createRzpOrder } from "@/lib/payments-razorpay";
import { FieldValue } from "firebase-admin/firestore";

/**
 * IMPORTANT:
 *
 * - Booking is already created in /api/bookings
 * - This route ONLY creates a Razorpay Order for that booking
 * - Pay-at-Hotel MUST NOT be handled here
 */
export const POST = withAuth(
  async (req, ctx) => {
    const { adminDb, decoded } = ctx;

    const userId = decoded.uid;
    const body = await req.json().catch(() => ({}));

    const { bookingId, amount, listingId } = body;

    /* ----------------------------------------------------
       0️⃣ Basic validation
    ---------------------------------------------------- */
    if (!bookingId || !amount || !listingId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: bookingId, amount, listingId",
        },
        { status: 400 }
      );
    }

    /* ----------------------------------------------------
       1️⃣ Fetch booking → MUST EXIST
    ---------------------------------------------------- */
    const bookingRef = adminDb.collection("bookings").doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    const booking = bookingSnap.data();

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking data is invalid" },
        { status: 500 }
      );
    }

    /* ----------------------------------------------------
       Prevent accidental RZP order creation for Pay-at-Hotel
    ---------------------------------------------------- */
    if (booking.paymentMode === "pay_at_hotel") {
      return NextResponse.json(
        {
          success: false,
          error: "Pay-at-Hotel bookings cannot create Razorpay orders",
        },
        { status: 403 }
      );
    }

    const partnerId = booking.partnerId;

    /* ----------------------------------------------------
       2️⃣ Create Razorpay order
    ---------------------------------------------------- */
    let rzpOrder;

    try {
      rzpOrder = await createRzpOrder({
        amount: Number(amount),
        currency: "INR",
        receipt: `booking_${bookingId}_${Date.now()}`,
      });
    } catch (err: any) {
      console.error("Razorpay Error:", err);
      return NextResponse.json(
        { success: false, error: err.message || "Razorpay order creation failed" },
        { status: 500 }
      );
    }

    if (!rzpOrder?.id) {
      return NextResponse.json(
        { success: false, error: "Invalid Razorpay order response" },
        { status: 500 }
      );
    }

    /* ----------------------------------------------------
       3️⃣ Save payment intent (central payments collection)
    ---------------------------------------------------- */
    const paymentDocRef = adminDb.collection("payments").doc(rzpOrder.id);

    await paymentDocRef.set({
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

    /* ----------------------------------------------------
       4️⃣ Return order with Razorpay public key
    ---------------------------------------------------- */
    return NextResponse.json({
      success: true,
      razorpayOrder: rzpOrder,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  },
  { requireRole: ["user", "partner", "admin"] }
);
