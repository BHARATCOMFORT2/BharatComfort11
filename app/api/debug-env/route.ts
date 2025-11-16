export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "❌ Missing",
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "❌ Missing",
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET ? "✅ Present" : "❌ Missing",
  });
}
