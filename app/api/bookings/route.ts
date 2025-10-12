// app/api/bookings/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { razorpay } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  const { adminDb } = getFirebaseAdmin();

  try {
    const { userId, partnerId, listingId, amount, checkIn, checkOut, guests } = await req.json();

    // ✅ Validation
    if (!userId || !partnerId || !listingId || !amount) {
      return NextResponse.json(
        { success: false, error: "Missing required booking fields." },
        { status: 400 }
      );
    }

    // ✅ Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: {
        userId,
        partnerId,
        listingId,
        checkIn: checkIn || "",
        checkOut: checkOut || "",
        guests: guests ? String(guests) : "1",
      },
    });

    // ✅ Add booking to Firestore
    const newBooking = {
      userId,
      partnerId,
      listingId,
      amount,
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      guests: guests || 1,
      status: "pending", // until payment verified
      razorpayOrderId: order.id, // link order id
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await adminDb.collection("bookings").add(newBooking);

    // ✅ Return order info to frontend
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
      },
      bookingId: docRef.id,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY, // public key for client
    });
  } catch (err: any) {
    console.error("❌ Error creating booking:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
