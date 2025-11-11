// app/api/payments/create-order/route.ts
export const runtime = "nodejs"; // ✅ Required for crypto & Razorpay SDK

import { NextRequest, NextResponse } from "next/server";
import { getRazorpayServerInstance } from "@/lib/payments-razorpay";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import admin from "firebase-admin";

/* ============================================================
   🔥 Initialize Firebase Admin
============================================================ */
const { adminDb } = getFirebaseAdmin();

/* ============================================================
   💳 POST: Create Secure Razorpay Order
============================================================ */
export async function POST(req: NextRequest) {
  try {
    const { amount, listingId } = await req.json();

    /* --------------------------------------------------------
       🔐 Verify Firebase Auth Token
    -------------------------------------------------------- */
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing ID token" },
        { status: 401 }
      );
    }

    const idToken = authHeader.split("Bearer ")[1];
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      console.warn("⚠️ Invalid Firebase token:", err);
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or expired token" },
        { status: 403 }
      );
    }

    const userId = decoded.uid;

    /* --------------------------------------------------------
       ✅ Validate Payment Input
    -------------------------------------------------------- */
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid payment amount" },
        { status: 400 }
      );
    }

    /* --------------------------------------------------------
       ⚙️ Initialize Razorpay Server Instance
    -------------------------------------------------------- */
    const razorpay = getRazorpayServerInstance();
    if (!razorpay) {
      console.error("❌ Razorpay instance not initialized");
      return NextResponse.json(
        { success: false, error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    /* --------------------------------------------------------
       💳 Create Razorpay Order
    -------------------------------------------------------- */
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: { userId, listingId },
    });

    /* --------------------------------------------------------
       💾 Store Payment Record in Firestore
    -------------------------------------------------------- */
    await adminDb.collection("payments").doc(order.id).set({
      userId,
      listingId: listingId || null,
      amount,
      currency: "INR",
      status: "created",
      razorpayOrderId: order.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Razorpay order created: ${order.id} for ₹${amount}`);

    /* --------------------------------------------------------
       ✅ Respond to Client
    -------------------------------------------------------- */
    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error("❌ Payment creation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
