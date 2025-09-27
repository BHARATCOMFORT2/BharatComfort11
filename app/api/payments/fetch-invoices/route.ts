import { NextResponse } from "next/server";
import { razorpay } from "@/lib/payments-razorpay";

export const dynamic = "force-dynamic"; // 🚀

export async function GET() {
  if (!razorpay) {
    return NextResponse.json(
      { error: "Razorpay not configured" },
      { status: 500 }
    );
  }

  try {
    const invoices = await razorpay.invoices.all();
    return NextResponse.json(invoices);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
