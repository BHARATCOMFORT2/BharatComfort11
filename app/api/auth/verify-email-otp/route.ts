// app/api/auth/verify-email-otp/route.ts

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { verifyEmailOtp } from "@/lib/email-otp";

// ✅ In-memory brute-force limiter
const otpAttemptLimiter = new Map<string, { count: number; lastTry: number }>();
const MAX_ATTEMPTS = 5;
const BLOCK_TIME_MS = 10 * 60 * 1000; // 10 minutes block

/**
 * ✅ verify-email-otp API
 * Securely validates OTP for a given email.
 * - Email normalization
 * - Brute-force protection
 * - Replay safe
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    let { email, otp } = body || {};

    if (!email || typeof email !== "string" || !otp || typeof otp !== "string") {
      return NextResponse.json(
        { success: false, message: "Valid email and OTP are required." },
        { status: 400 }
      );
    }

    // ✅ Normalize email
    email = email.trim().toLowerCase();
    otp = otp.trim();

    // ✅ Brute-force protection
    const attempt = otpAttemptLimiter.get(email);

    if (attempt) {
      if (
        attempt.count >= MAX_ATTEMPTS &&
        Date.now() - attempt.lastTry < BLOCK_TIME_MS
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "❌ Too many invalid OTP attempts. Please try again after 10 minutes.",
          },
          { status: 429 }
        );
      }
    }

    const isValid = verifyEmailOtp(email, otp);

    if (!isValid) {
      otpAttemptLimiter.set(email, {
        count: attempt ? attempt.count + 1 : 1,
        lastTry: Date.now(),
      });

      return NextResponse.json(
        { success: false, message: "Invalid or expired OTP." },
        { status: 401 }
      );
    }

    // ✅ Clear attempts after successful verification
    otpAttemptLimiter.delete(email);

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
