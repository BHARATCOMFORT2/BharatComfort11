export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { sendEmailOtp } from "@/lib/email-otp";

/**
 * 📧 send-email-otp API
 * Securely generates and sends an OTP to the user's email.
 * Uses Nodemailer + in-memory OTP store.
 */
export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, message: "Valid email is required." },
        { status: 400 }
      );
    }

    // 🧩 Send OTP via helper
    await sendEmailOtp(email);

    return NextResponse.json({
      success: true,
      message: "✅ OTP sent successfully to your email.",
    });
  } catch (err: any) {
    console.error("❌ send-email-otp error:", err);
    return NextResponse.json(
      {
        success: false,
        message:
          err?.message || "Failed to send OTP. Please try again in a few minutes.",
      },
      { status: 500 }
    );
  }
}
