import { NextResponse } from "next/server";
import { razorpay } from "@/lib/payments-razorpay";

export async function GET(req: Request) {
  try {
    const invoices = await razorpay.invoices.all();
    return NextResponse.json({ invoices });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}
