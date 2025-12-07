// app/api/auth/send-email-otp/route.ts

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { sendEmailOtp } from "@/lib/email-otp";

// ✅ In-memory anti-spam limiter (per deployment instance)
const emailRateLimit = new Map<string, number>();
const OTP_COOLDOWN_MS = 60 * 1000; // 60 seconds cooldown

/**
 * 📧 send-email-otp API
 * Securely generates and sends an OTP to the user's email.
 * - Anti-spam protection
 * - Cooldown protection
 * - Email normalization
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    let email = body?.email;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, message: "Valid email is required." },
        { status: 400 }
      );
    }

    // ✅ Normalize email (critical for security)
    email = email.trim().toLowerCase();

    // ✅ Rate limit / cooldown check
    const lastSentAt = emailRateLimit.get(email);

    if (lastSentAt && Date.now() - lastSentAt < OTP_COOLDOWN_MS) {
      const waitSec = Math.ceil(
        (OTP_COOLDOWN_MS - (Date.now() - lastSentAt)) / 1000
      );

      return NextResponse.json(
        {
          success: false,
          message: `⚠️ Please wait ${waitSec} seconds before requesting another OTP.`,
        },
        { status: 429 }
      );
    }

    // ✅ Send OTP via helper
    await sendEmailOtp(email);

    // ✅ Save timestamp after success
    emailRateLimit.set(email, Date.now());

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
          err?.message ||
          "Failed to send OTP. Please try again in a few minutes.",
      },
      { status: 500 }
    );
  }
}
