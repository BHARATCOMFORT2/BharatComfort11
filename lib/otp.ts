// lib/otp.ts
import { auth } from "@/lib/firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";

/**
 * 🌟 Global OTP Manager
 * Handles: reCAPTCHA, OTP sending, verification, and session persistence.
 */

let recaptchaVerifier: RecaptchaVerifier | null = null;
let confirmationResult: ConfirmationResult | null = null;

/* =====================================================
   🔐 Initialize reCAPTCHA (Only once per app)
===================================================== */
export const initRecaptcha = (containerId = "recaptcha-container") => {
  if (typeof window === "undefined") return;

  if (!recaptchaVerifier) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error("⚠️ No reCAPTCHA container found:", containerId);
      return;
    }

    recaptchaVerifier = new RecaptchaVerifier(
      container,
      {
        size: "invisible",
        callback: () => {
          console.log("✅ reCAPTCHA solved");
        },
      },
      auth
    );

    recaptchaVerifier.render();
    console.log("✅ reCAPTCHA initialized once globally");
  }
};

/* =====================================================
   📲 Send OTP
===================================================== */
export const sendOtp = async (phone: string): Promise<boolean> => {
  if (!recaptchaVerifier) {
    initRecaptcha();
  }

  try {
    confirmationResult = await signInWithPhoneNumber(
      auth,
      phone,
      recaptchaVerifier!
    );

    // Persist OTP session
    sessionStorage.setItem("otpConfirm", JSON.stringify(confirmationResult));
    sessionStorage.setItem("otpPhone", phone);
    sessionStorage.setItem("otpSentAt", Date.now().toString());

    console.log("📲 OTP sent successfully to", phone);
    return true;
  } catch (err) {
    console.error("❌ OTP send error:", err);
    throw new Error("Failed to send OTP. Please try again.");
  }
};

/* =====================================================
   ✅ Verify OTP
===================================================== */
export const verifyOtp = async (otp: string) => {
  if (!otp?.trim()) throw new Error("Enter OTP first.");

  // Recover confirmation result from memory or storage
  if (!confirmationResult) {
    const stored = sessionStorage.getItem("otpConfirm");
    if (stored) {
      confirmationResult = JSON.parse(stored);
    }
  }

  if (!confirmationResult) {
    throw new Error("OTP session expired. Please resend OTP.");
  }

  const sentAt = parseInt(sessionStorage.getItem("otpSentAt") || "0");
  if (Date.now() - sentAt > 15 * 60 * 1000) {
    throw new Error("OTP expired. Please resend.");
  }

  try {
    const result = await confirmationResult.confirm(otp.trim());
    if (!result?.user) throw new Error("Invalid OTP response.");
    console.log("✅ OTP verified successfully for:", result.user.phoneNumber);
    return result.user;
  } catch (err: any) {
    console.error("❌ OTP verify error:", err);
    if (err.code?.includes("expired") || err.message?.includes("expired")) {
      throw new Error("OTP expired. Please resend.");
    }
    throw new Error("Invalid OTP. Please try again.");
  }
};

/* =====================================================
   🔁 Resend OTP
===================================================== */
export const resendOtp = async (phone?: string): Promise<boolean> => {
  const storedPhone = phone || sessionStorage.getItem("otpPhone");
  if (!storedPhone) throw new Error("No phone number found for resend.");

  return await sendOtp(storedPhone);
};

/* =====================================================
   🧹 Cleanup OTP Session
===================================================== */
export const clearOtpSession = () => {
  recaptchaVerifier = null;
  confirmationResult = null;
  sessionStorage.removeItem("otpConfirm");
  sessionStorage.removeItem("otpPhone");
  sessionStorage.removeItem("otpSentAt");
  console.log("🧹 OTP session cleared");
};
