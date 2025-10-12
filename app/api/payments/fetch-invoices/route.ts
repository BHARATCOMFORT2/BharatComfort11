import { NextResponse } from "next/server";
import { razorpay } from "@/lib/payments-razorpay";

export async function GET(req: Request) {
  try {
    if (!razorpay) {
      throw new Error("Razorpay client not initialized.");
    }

    const invoices = await razorpay.invoices.all();

    return NextResponse.json({
      success: true,
      invoices,
    });
  } catch (err) {
    console.error("❌ Fetch Invoices API error:", err);

    const message =
      err instanceof Error ? err.message : "Unknown server error";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}
