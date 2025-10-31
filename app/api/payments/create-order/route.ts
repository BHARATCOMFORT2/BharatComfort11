// app/api/payments/create-order/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getRazorpayServerInstance } from "@/lib/payments-razorpay";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import admin from "firebase-admin";

/* ============================================================
   🧠 INITIALIZE FIREBASE ADMIN
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
    const decoded = await admin.auth().verifyIdToken(idToken).catch(() => null);

    if (!decoded?.uid) {
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
       ⚙️ Initialize Razorpay Server
    -------------------------------------------------------- */
    const razorpay = getRazorpayServerInstance();
    if (!razorpay) {
      console.error("❌ Razorpay not initialized");
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
       📦 Store Payment Record in Firestore
    -------------------------------------------------------- */
    const orderRef = adminDb.collection("payments").doc(order.id);
    await orderRef.set({
      userId,
      listingId: listingId || null,
      amount,
      currency: "INR",
      status: "pending",
      razorpayOrderId: order.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    /* --------------------------------------------------------
       ✅ Respond to Client
    -------------------------------------------------------- */
    return NextResponse.json({
      success: true,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err: any) {
    console.error("❌ Payment creation error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
