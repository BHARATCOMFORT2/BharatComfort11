import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { razorpay } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  const { adminDb } = getFirebaseAdmin();

  try {
    const data = await req.json();

    // ------------------ Validation ------------------
    const { userId, partnerId, listingId, amount, checkIn, checkOut, guests } = data;
    if (!userId || !partnerId || !listingId || !amount) {
      return NextResponse.json(
        { success: false, error: "Missing required booking fields." },
        { status: 400 }
      );
    }

    // ------------------ Create Razorpay Order ------------------
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // in paise
      currency: "INR",
      receipt: `booking_${Date.now()}`,
      notes: {
        userId,
        partnerId,
        listingId,
      },
    });

    // ------------------ Save Booking in Firestore ------------------
    const newBooking = {
      userId,
      partnerId,
      listingId,
      amount,
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      guests: guests || 1,
      status: "pending", // until payment verification
      createdAt: new Date(),
      updatedAt: new Date(),
      razorpayOrderId: razorpayOrder.id,
    };

    const docRef = await adminDb.collection("bookings").add(newBooking);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        status: razorpayOrder.status,
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY, // send frontend key
      },
    });
  } catch (err: any) {
    console.error("❌ Error creating booking:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
