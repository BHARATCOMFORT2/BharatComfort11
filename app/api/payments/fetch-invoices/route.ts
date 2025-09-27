import { NextResponse } from "next/server";
import { razorpay } from "@/lib/payments-razorpay";

export async function GET() {
  try {
    const invoices = await razorpay.invoices.all({});

    return NextResponse.json({ success: true, invoices });
  } catch (error: any) {
    console.error("Fetch invoices error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
