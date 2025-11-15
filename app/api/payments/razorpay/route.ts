export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getRazorpayServerInstance } from "@/lib/payments-razorpay";
import { getFirebaseAdmin } from "@/lib/firebaseadmin"; // ✅ use admin SDK
import { FieldValue } from "firebase-admin/firestore";

/* --------------------------------------------------------
   INIT — ADMIN FIREBASE
-------------------------------------------------------- */
const { adminDb } = getFirebaseAdmin();

export async function POST(req: Request) {
  try {
    const { amount, userId } = await req.json();

    // ✅ Validate amount
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Amount is required and must be greater than 0" },
        { status: 400 }
      );
    }

    // ✅ Initialize Razorpay
    const razorpay = getRazorpayServerInstance();
    if (!razorpay) {
      return NextResponse.json(
        { success: false, error: "Razorpay client not initialized" },
        { status: 500 }
      );
    }

    /* --------------------------------------------------------
       1️⃣ Create Razorpay order
    -------------------------------------------------------- */
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // amount in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: { userId: userId ?? "guest" },
    });

    /* --------------------------------------------------------
       2️⃣ Save order to Firestore (Admin DB)
    -------------------------------------------------------- */
    await adminDb.collection("orders").doc(order.id).set({
      userId: userId ?? "guest",
      amount,
      currency: "INR",
      status: "created",
      razorpayOrderId: order.id,
      receipt: order.receipt,
      createdAt: FieldValue.serverTimestamp(),
    });

    /* --------------------------------------------------------
       3️⃣ Response
    -------------------------------------------------------- */
    return NextResponse.json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (error: any) {
    console.error("❌ Razorpay Order API Error:", error);
    const message = error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
