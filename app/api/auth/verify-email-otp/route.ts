import { NextResponse } from "next/server";
import { verifyEmailOtp } from "@/lib/email-otp";

/**
 * ✅ verify-email-otp API
 * Validates OTP for a given email using the in-memory OTP store.
 * Used in Step 3 of the registration flow.
 */
export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || typeof email !== "string" || !otp || typeof otp !== "string") {
      return NextResponse.json(
        { success: false, message: "Valid email and OTP are required." },
        { status: 400 }
      );
    }

    const isValid = verifyEmailOtp(email, otp);

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired OTP." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "✅ Email verified successfully.",
    });
  } catch (err: any) {
    console.error("❌ verify-email-otp error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
