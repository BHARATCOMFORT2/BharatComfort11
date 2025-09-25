import { NextResponse } from "next/server";
import Razorpay from "razorpay";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!razorpay) {
    return NextResponse.json(
      { error: "Razorpay not configured" },
      { status: 500 }
    );
  }
export async function GET() {
  try {
    const invoices = await razorpay.invoices.all({ count: 20 });
    return NextResponse.json({ success: true, invoices: invoices.items });
  } catch (error: any) {
    console.error("❌ Fetch invoices error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
