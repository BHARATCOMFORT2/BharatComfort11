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

    // Create Razorpay order
    const options = {
      amount: Math.round(amount), // amount in paisa
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        listingId,
        checkIn,
        checkOut,
        guests: String(guests),
      },
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
    });
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    return NextResponse.json(
      { error: "Failed to create Razorpay order" },
      { status: 500 }
    );
  }
}
