import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { razorpay } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  const { adminDb } = getFirebaseAdmin();

  try {
    const { userId, partnerId, listingId, amount } = await req.json();

    if (!userId || !partnerId || !listingId || !amount) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // ✅ Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `booking_${Date.now()}`,
    });

    // ✅ Save booking in Firestore
    const newBooking = {
      userId,
      partnerId,
      listingId,
      amount,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
      razorpayOrderId: order.id,
    };

    const docRef = await adminDb.collection("bookings").add(newBooking);

    return NextResponse.json({ success: true, id: docRef.id, order });
  } catch (err: any) {
    console.error("Booking error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
