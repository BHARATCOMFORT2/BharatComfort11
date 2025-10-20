import { NextResponse } from "next/server";
import { getRazorpayServerInstance } from "@/lib/payments-razorpay";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { amount, listingId, userId } = await req.json();

    // 🔍 Log key availability (server-only)
    console.log("🔍 ENV CHECK:", {
      keyId: process.env.RAZORPAY_KEY_ID,
      hasSecret: !!process.env.RAZORPAY_KEY_SECRET,
    });

    // ✅ 1️⃣ Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid amount provided" },
        { status: 400 }
      );
    }

    // ✅ 2️⃣ Initialize Razorpay server instance
    const razorpay = getRazorpayServerInstance();

    if (!razorpay) {
      console.error("❌ Razorpay instance is null");
      return NextResponse.json(
        {
          success: false,
          error:
            "Razorpay not initialized. Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET.",
        },
        { status: 500 }
      );
    }

    // ✅ 3️⃣ Attempt to create order with detailed error logging
    let order;
    try {
      order = await razorpay.orders.create({
        amount: Math.round(amount * 100), // Convert ₹ to paise
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
      });
    } catch (createErr: any) {
      console.error("❌ Razorpay order creation failed:", {
        message: createErr.message,
        stack: createErr.stack,
      });
      throw new Error("Razorpay order creation failed: " + createErr.message);
    }

    // ✅ 4️⃣ Store order in Firestore
    try {
      const orderRef = doc(db, "payments", order.id);
      await setDoc(orderRef, {
        userId: userId ?? "guest",
        listingId: listingId ?? null,
        amount,
        currency: "INR",
        status: "pending",
        razorpayOrderId: order.id,
        createdAt: serverTimestamp(),
      });
    } catch (firestoreErr: any) {
      console.error("🔥 Firestore write failed:", firestoreErr);
      // Don’t fail the whole API, still return order so user can pay
    }

    // ✅ 5️⃣ Respond to frontend
    return NextResponse.json({
      success: true,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err: any) {
    console.error("❌ Uncaught error in create-order:", {
      message: err.message,
      stack: err.stack,
    });

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
