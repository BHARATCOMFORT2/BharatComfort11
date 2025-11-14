// app/api/payments/create-order/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getRazorpayServerInstance } from "@/lib/payments-razorpay";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

const { adminDb, adminAuth, admin } = getFirebaseAdmin();

/* -------------------------------------------------------
   POST — Create Razorpay Order (Unified)
------------------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
    const { amount, bookingId, listingId } = await req.json();

    /* -------------------------------------------------------
       1️⃣ Verify session cookie AUTH
    ------------------------------------------------------- */
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionCookie =
      cookieHeader.split(";").find((c) => c.trim().startsWith("__session=")) ||
      null;

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: No session" },
        { status: 401 }
      );
    }

    const token = sessionCookie.split("=")[1];

    let decoded;
    try {
      decoded = await adminAuth.verifySessionCookie(token, true);
    } catch (err) {
      console.log("❌ Invalid session cookie", err);
      return NextResponse.json(
        { success: false, error: "Invalid or expired session" },
        { status: 403 }
      );
    }

    const userId = decoded.uid;

    /* -------------------------------------------------------
       2️⃣ Validate input
    ------------------------------------------------------- */
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

    /* -------------------------------------------------------
       3️⃣ Get Razorpay instance
    ------------------------------------------------------- */
    const razorpay = getRazorpayServerInstance();
    if (!razorpay) {
      console.error("❌ Razorpay instance not initialized");
      return NextResponse.json(
        { success: false, error: "Razorpay misconfigured" },
        { status: 500 }
      );
    }

    /* -------------------------------------------------------
       4️⃣ Create Razorpay Order
    ------------------------------------------------------- */
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // convert to paisa
      currency: "INR",
      receipt: `booking_${bookingId}`,
      notes: { userId, bookingId, listingId },
    });

    console.log("✅ Razorpay order created:", order.id);

    /* -------------------------------------------------------
       5️⃣ Store payment session
    ------------------------------------------------------- */
    await adminDb.collection("payments").doc(order.id).set({
      userId,
      bookingId,
      listingId: listingId || null,
      amount,
      currency: "INR",
      status: "created",
      razorpayOrderId: order.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    /* -------------------------------------------------------
       6️⃣ Return full order data
    ------------------------------------------------------- */
    return NextResponse.json({
      success: true,
      razorpayOrder: order,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error("❌ create-order API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
