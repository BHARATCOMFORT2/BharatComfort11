// app/api/payments/fetch-invoices/route.ts
import { NextResponse } from "next/server";
import { fetchInvoices } from "@/lib/payments-razorpay";

export async function GET() {
  try {
    const invoices = await fetchInvoices();
    return NextResponse.json(invoices, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
