import { NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function GET() {
  try {
    const invoices = await razorpay.invoices.all({ count: 20 });
    return NextResponse.json({ success: true, invoices: invoices.items });
  } catch (error: any) {
    console.error("❌ Fetch invoices error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
