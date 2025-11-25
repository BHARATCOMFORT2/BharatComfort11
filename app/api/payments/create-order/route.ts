export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { wrapRoute } from "@/lib/universal-wrapper";
import { getRazorpayServerInstance } from "@/lib/payments-razorpay";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST: Create Razorpay Order
 * Secured by universal wrapper:
 *  - verifies session cookie OR idToken
 *  - exposes ctx.uid, ctx.adminDb, ctx.adminAuth
 */
export const POST = wrapRoute(
  async (req, ctx) => {
    const { adminDb } = ctx;

    // Parse incoming request
    const body = await req.json().catch(() => ({}));
    const { amount, bookingId, listingId } = body;

    // Basic validation
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 }
      );
    }

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "Missing bookingId" },
        { status: 400 }
      );
    }

    // Razorpay instance
    const razorpay = getRazorpayServerInstance();
    if (!razorpay) {
      return NextResponse.json(
        { success: false, error: "Razorpay not configured" },
        { status: 500 }
      );
    }

    // Create Razorpay Order
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      receipt: `booking_${bookingId}`,
      notes: {
        userId: ctx.uid,
        bookingId,
        listingId: listingId || null,
      },
    });

    // Store order record
    await adminDb.collection("payments").doc(order.id).set({
      userId: ctx.uid,
      bookingId,
      listingId: listingId || null,
      amount,
      currency: "INR",
      status: "created",
      razorpayOrderId: order.id,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      razorpayOrder: order,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  },
  { requireAuth: true } // must be signed in
);
