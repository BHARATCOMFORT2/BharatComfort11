import { NextResponse } from "next/server";
import { razorpay } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  try {
    const { amount, listingId, checkIn, checkOut, guests } = await req.json();

    if (!amount || !listingId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const options = {
      amount: Math.round(amount * 100), // convert to paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        listingId,
        checkIn,
        checkOut,
        guests: String(guests || 1),
      },
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      success: true,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Send public key to frontend
    });
  } catch (error: any) {
    console.error("❌ Error creating Razorpay order:", error);
    return NextResponse.json(
      { error: "Failed to create Razorpay order" },
      { status: 500 }
    );
  }
}
