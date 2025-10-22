import { NextResponse } from "next/server";
import { getProvider } from "@/lib/payments/core";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

/**
 * 🔹 POST /api/payments/verify
 * Verifies Razorpay signature and updates Firestore record
 */
export async function POST(req: Request) {
  try {
    const { payload, context, listingId, userId } = await req.json();

    // ✅ 1️⃣ Validate Payload
    if (!payload?.razorpay_order_id || !payload?.razorpay_payment_id) {
      return NextResponse.json(
        { success: false, error: "Invalid Razorpay payload" },
        { status: 400 }
      );
    }

    // ✅ 2️⃣ Verify Signature via Provider
    const provider = getProvider();
    const result = await provider.verify({ payload });

    if (!result.ok) {
      console.error("❌ Payment verification failed:", result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // ✅ 3️⃣ Update Firestore Record
    try {
      await updateDoc(doc(db, "payments", result.orderId!), {
        status: "success",
        verifiedAt: serverTimestamp(),
        razorpayPaymentId: result.paymentId,
        context: context || "general",
        listingId: listingId ?? null,
        userId: userId ?? "guest",
      });
      console.log("✅ Payment verified:", result.orderId);
    } catch (fireErr: any) {
      console.warn("⚠️ Firestore update failed:", fireErr.message);
      // Continue anyway, as Razorpay verification is done
    }

    // ✅ 4️⃣ Respond to Frontend
    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
      orderId: result.orderId,
      paymentId: result.paymentId,
    });
  } catch (err: any) {
    console.error("❌ /api/payments/verify error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
