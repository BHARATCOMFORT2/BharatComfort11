import { NextResponse } from "next/server";
import { sendEmailOtp } from "@/lib/email-otp";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) throw new Error("Email is required.");
    await sendEmailOtp(email);
    return NextResponse.json({ success: true, message: "OTP sent successfully." });
  } catch (err: any) {
    console.error("❌ send-email-otp error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}
