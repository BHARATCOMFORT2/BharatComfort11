import { NextRequest, NextResponse } from "next/server";
import { getRazorpayServerInstance } from "@/lib/payments-razorpay";
import { db } from "@/lib/firebaseadmin"; // ✅ Use admin SDK for secure access
import admin from "firebase-admin";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const { amount, listingId } = await req.json();

    // ✅ 1️⃣ Require Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing ID token" },
        { status: 401 }
      );
    }

    // ✅ 2️⃣ Verify Firebase ID Token
    const idToken = authHeader.split("Bearer ")[1];
    const decoded = await admin.auth().verifyIdToken(idToken).catch(() => null);

    if (!decoded?.uid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or expired token" },
        { status: 403 }
      );
    }

    const userId = decoded.uid;

    // ✅ 3️⃣ Validate Input
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid amount provided" },
        { status: 400 }
      );
    }

    // ✅ 4️⃣ Initialize Razorpay securely
    const razorpay = getRazorpayServerInstance();
    if (!razorpay) {
      console.error("❌ Razorpay not initialized");
      return NextResponse.json(
        { success: false, error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    // ✅ 5️⃣ Create Razorpay Order
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: { userId, listingId },
    });

    // ✅ 6️⃣ Save Payment Info in Firestore
    const orderRef = doc(db, "payments", order.id);
    await setDoc(orderRef, {
      userId,
      listingId: listingId ?? null,
      amount,
      currency: "INR",
      status: "pending",
      razorpayOrderId: order.id,
      createdAt: serverTimestamp(),
    });

    // ✅ 7️⃣ Respond
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
