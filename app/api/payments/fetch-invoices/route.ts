export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getRazorpayServerInstance } from "@/lib/payments-razorpay";

export async function GET() {
  try {
    // always get fresh instance in Node runtime
    const razorpay = getRazorpayServerInstance();

    if (!razorpay) {
      throw new Error("Razorpay client not initialized.");
    }

    // Fetch invoices
    const invoices = await razorpay.invoices.all({ count: 50 });

    return NextResponse.json({
      success: true,
      message: "Invoices fetched successfully.",
      invoices,
    });
  } catch (err: any) {
    console.error("❌ Fetch Invoices API error:", err);

    const message =
      err instanceof Error ? err.message : "Unknown server error";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
