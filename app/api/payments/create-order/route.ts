export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/universal-wrapper";
import { createOrder as createRzpOrder } from "@/lib/payments-razorpay";
import { FieldValue } from "firebase-admin/firestore";

/* ---------------------------------------------------------
   POST — Create Razorpay Order for Existing Booking
--------------------------------------------------------- */
export const POST = withAuth(
  async (req, ctx) => {
    const { adminDb, decoded } = ctx;
    const userId = decoded.uid;

    const body = await req.json().catch(() => ({}));
    const { bookingId } = body;

    /* ---------------------------------------------------------
       0️⃣ Validate input
    --------------------------------------------------------- */
    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "bookingId required" },
        { status: 400 }
      );
    }

    /* ---------------------------------------------------------
       1️⃣ Fetch Booking
    --------------------------------------------------------- */
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
        { success: false, error: "Invalid booking data" },
        { status: 500 }
      );
    }

    /* ---------------------------------------------------------
       2️⃣ Security checks
    --------------------------------------------------------- */

    // Only booking owner can create payment order
    if (booking.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized booking access" },
        { status: 403 }
      );
    }

    // Pay-at-hotel should never create Razorpay order
    if (booking.paymentMode === "pay_at_hotel") {
      return NextResponse.json(
        {
          success: false,
          error: "Pay-at-hotel bookings cannot create Razorpay orders",
        },
        { status: 403 }
      );
    }

    // Only pending payment bookings allowed
    if (booking.status !== "pending_payment") {
      return NextResponse.json(
        {
          success: false,
          error: "Payment already processed or booking invalid",
        },
        { status: 400 }
      );
    }

    const amount = Number(booking.amount);
    const listingId = booking.listingId;
    const partnerId = booking.partnerId;

    if (!amount || !listingId || !partnerId) {
      return NextResponse.json(
        { success: false, error: "Booking missing required fields" },
        { status: 500 }
      );
    }

    /* ---------------------------------------------------------
       3️⃣ Prevent duplicate payment order
    --------------------------------------------------------- */

    if (booking.razorpayOrderId) {
      const existingPayment = await adminDb
        .collection("payments")
        .doc(booking.razorpayOrderId)
        .get();

      if (existingPayment.exists) {
        return NextResponse.json({
          success: true,
          razorpayOrderId: booking.razorpayOrderId,
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          message: "Existing Razorpay order reused",
        });
      }
    }

    /* ---------------------------------------------------------
       4️⃣ Create Razorpay order
    --------------------------------------------------------- */

    let rzpOrder;

    try {
      rzpOrder = await createRzpOrder({
        amount,
        currency: "INR",
        receipt: `booking_${bookingId}_${Date.now()}`,
      });
    } catch (err: any) {
      console.error("Razorpay Error:", err);

      return NextResponse.json(
        { success: false, error: "Razorpay order creation failed" },
        { status: 500 }
      );
    }

    if (!rzpOrder?.id) {
      return NextResponse.json(
        { success: false, error: "Invalid Razorpay order response" },
        { status: 500 }
      );
    }

    const now = FieldValue.serverTimestamp();

    /* ---------------------------------------------------------
       5️⃣ Save payment intent
    --------------------------------------------------------- */

    await adminDb.collection("payments").doc(rzpOrder.id).set({
      status: "created",
      razorpayOrderId: rzpOrder.id,

      bookingId,
      listingId,
      partnerId,
      userId,

      amount,
      currency: "INR",

      createdAt: now,
      updatedAt: now,
    });

    /* ---------------------------------------------------------
       6️⃣ Save order reference in booking
    --------------------------------------------------------- */

    await bookingRef.update({
      razorpayOrderId: rzpOrder.id,
      updatedAt: now,
    });

    /* ---------------------------------------------------------
       7️⃣ Return Razorpay order
    --------------------------------------------------------- */

    return NextResponse.json({
      success: true,
      razorpayOrder: rzpOrder,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  },
  { requireRole: ["user", "partner", "admin"] }
);
