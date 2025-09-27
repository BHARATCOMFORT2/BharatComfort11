// app/api/payments/route.ts
import { NextResponse } from "next/server";
import { createOrder } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const amount = Number(body.amount); // ✅ ensure it's a number
    const currency = body.currency || "INR";

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 }
      );
    }

    // ✅ Pass a single object with typed values
    const order = await createOrder({ amount, currency });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("Error creating order:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
