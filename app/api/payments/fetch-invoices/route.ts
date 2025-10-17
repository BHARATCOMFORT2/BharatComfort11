import { NextResponse } from "next/server";
import { razorpay } from "@/lib/payments-razorpay"; // ✅ unified import

export async function GET() {
  try {
    if (!razorpay) {
      throw new Error("Razorpay client not initialized.");
    }

    // ✅ Fetch all invoices (limit optional)
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
