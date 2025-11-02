import { NextResponse } from "next/server";
import { verifyEmailOtp } from "@/lib/email-otp";

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp) throw new Error("Email and OTP are required.");
    const ok = await verifyEmailOtp(email, otp);
    return NextResponse.json({ success: ok, message: "Email verified successfully." });
  } catch (err: any) {
    console.error("❌ verify-email-otp error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}
