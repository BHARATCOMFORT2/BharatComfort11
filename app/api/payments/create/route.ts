import { NextResponse } from "next/server";
import { getProvider } from "@/lib/payments/core";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * 🔹 POST /api/payments/create
 * Creates a Razorpay order and stores a pending record in Firestore
 */
export async function POST(req: Request) {
  try {
    const { amount, context, listingId, userId } = await req.json();
    if (!userId || userId === "guest-user") {
  return NextResponse.json(
    { success: false, error: "Unauthorized: Login required" },
    { status: 401 }
  );
}

    // ✅ 1️⃣ Validate Input
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid payment amount" },
        { status: 400 }
      );
    }

    // ✅ 2️⃣ Initialize Payment Provider (Razorpay)
    const provider = getProvider();

    // ✅ 3️⃣ Create Razorpay Order
    const result = await provider.createOrder({
      amount,
      meta: { context, listingId, userId },
    });

    // ✅ 4️⃣ Save Payment Record in Firestore
    try {
      await setDoc(doc(db, "payments", result.orderId), {
        provider: result.provider,
        status: "pending",
        context: context || "general",
        amount,
        currency: result.currency,
        listingId: listingId ?? null,
        userId: userId ?? "guest",
        createdAt: serverTimestamp(),
      });
    } catch (fireErr: any) {
      console.warn("⚠️ Firestore payment record failed:", fireErr.message);
      // Continue — we still return order details even if Firestore write fails
    }

    // ✅ 5️⃣ Respond to Client
    return NextResponse.json({
      success: true,
      id: result.orderId,
      amount,
      currency: result.currency,
    });
  } catch (err: any) {
    console.error("❌ /api/payments/create error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
