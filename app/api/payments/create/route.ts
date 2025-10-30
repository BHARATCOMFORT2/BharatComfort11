import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/payments/core";
import { db } from "@/lib/firebaseadmin"; // ✅ use admin SDK here
import admin from "firebase-admin";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * 🔹 POST /api/payments/create-order
 * Securely creates a Razorpay order (only for verified Firebase users)
 */
export async function POST(req: NextRequest) {
  try {
    const { amount, context, listingId } = await req.json();

    // 🔒 Verify Firebase Auth Token
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: No token provided" },
        { status: 401 }
      );
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decoded = await admin.auth().verifyIdToken(idToken).catch(() => null);

    if (!decoded?.uid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid token" },
        { status: 403 }
      );
    }

    const userId = decoded.uid;

    // ✅ Validate amount
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid payment amount" },
        { status: 400 }
      );
    }

    // ✅ Create Razorpay Order
    const provider = getProvider();
    const result = await provider.createOrder({
      amount,
      meta: { context, listingId, userId },
    });

    // ✅ Save Firestore record (optional)
    await setDoc(doc(db, "payments", result.orderId), {
      provider: result.provider,
      status: "pending",
      context: context || "general",
      amount,
      currency: result.currency,
      listingId: listingId ?? null,
      userId,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      id: result.orderId,
      amount,
      currency: result.currency,
    });
  } catch (err: any) {
    console.error("❌ create-order error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
