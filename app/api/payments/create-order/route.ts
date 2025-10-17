import { NextResponse } from "next/server";
import { createOrder } from "@/lib/payments-razorpay"; // ✅ unified import
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { amount, listingId, userId } = await req.json();

    // ✅ Validation
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 }
      );
    }

    // ✅ Step 1: Create Razorpay order via unified helper
    const order = await createOrder({ amount });

    // ✅ Step 2: Store a pending payment record in Firestore
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

    // ✅ Return order details to frontend
    return NextResponse.json({
      success: true,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err: any) {
    console.error("Error creating Razorpay order:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to create Razorpay order",
      },
      { status: 500 }
    );
  }
}
