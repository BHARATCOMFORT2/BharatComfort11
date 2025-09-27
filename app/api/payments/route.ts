// app/api/payments/route.ts
import { NextResponse } from "next/server";
import { createOrder } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  try {
    const { amount, currency = "INR" } = await req.json();

    // ✅ Corrected: pass a single object to createOrder
    const order = await createOrder({ amount, currency });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("Error creating order:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
