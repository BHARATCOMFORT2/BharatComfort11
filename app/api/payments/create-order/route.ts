// app/api/create-order/route.ts
import { NextResponse } from "next/server";
import { razorpay } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  try {
    const { amount, listingId, checkIn, checkOut, guests } = await req.json();

    if (!amount || !listingId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const options = {
      amount: Math.round(amount * 100), // convert to paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
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
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY, // frontend uses this
    });
  } catch (error: any) {
    console.error("❌ Razorpay create order error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
