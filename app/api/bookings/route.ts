import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { razorpay } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  const { adminDb } = getFirebaseAdmin();

  try {
    const data = await req.json();
    const { userId, partnerId, listingId, amount, checkIn, checkOut, guests } = data;

    if (!userId || !partnerId || !listingId || !amount) {
      return NextResponse.json(
        { success: false, error: "Missing required booking fields." },
        { status: 400 }
      );
    }

    // ✅ Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
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
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      guests: guests || 1,
      status: "pending", // until payment verified
      createdAt: new Date(),
      updatedAt: new Date(),
      razorpayOrderId: razorpayOrder.id,
    };

    const docRef = await adminDb.collection("bookings").add(newBooking);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      order: razorpayOrder,
    });
  } catch (err: any) {
    console.error("Error creating booking:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
