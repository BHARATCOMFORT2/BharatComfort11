import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/payments-razorpay";

export async function POST(req: NextRequest) {
  try {
    const { amount, currency } = await req.json();

    // Call createOrder and await the result
    const order = await createOrder(amount, currency);

    // Now you can safely access order.id
    return NextResponse.json({
      success: true,
      orderId: order.id,
      order,
    });
  } catch (error: any) {
    console.error("Payment order creation failed:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
