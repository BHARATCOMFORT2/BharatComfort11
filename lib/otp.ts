import { auth } from "@/lib/firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";

/**
 * 🌟 OTP Utility for BharatComfort11
 * Handles:
 *  - reCAPTCHA initialization
 *  - sending OTP
 *  - verifying OTP
 *  - resending OTP safely
 *  - cleanup of stale sessions
 */

let recaptchaVerifier: RecaptchaVerifier | null = null;
let confirmationResult: ConfirmationResult | null = null;

/* =====================================================
   🔐 Initialize reCAPTCHA (only once per page load)
===================================================== */
export const initRecaptcha = (containerId = "recaptcha-container") => {
  if (typeof window === "undefined") return;

  try {
    // Prevent reinitialization
    if (recaptchaVerifier) {
      console.log("⚙️ reCAPTCHA already initialized.");
      return;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error("⚠️ No reCAPTCHA container found:", containerId);
      return;
    }

    // ✅ Correct order (auth, container, options)
    recaptchaVerifier = new RecaptchaVerifier(
      auth,
      container,
      {
        size: "invisible",
        callback: () => console.log("✅ reCAPTCHA solved"),
        "expired-callback": () => {
          console.warn("⚠️ reCAPTCHA expired, reinitializing...");
          recaptchaVerifier = null;
          initRecaptcha(containerId);
        },
      }
    );

    recaptchaVerifier.render();
    console.log("✅ reCAPTCHA initialized successfully");
  } catch (err) {
    console.error("❌ reCAPTCHA initialization error:", err);
  }
};

/* =====================================================
   📲 Send OTP
===================================================== */
export const sendOtp = async (phone: string): Promise<boolean> => {
  if (typeof window === "undefined") throw new Error("Cannot send OTP server-side.");
  if (!phone) throw new Error("Phone number is required.");

  // Initialize reCAPTCHA if not present
  if (!recaptchaVerifier) initRecaptcha();

  try {
    console.log("📡 Sending OTP to:", phone);
    confirmationResult = await signInWithPhoneNumber(auth, phone, recaptchaVerifier!);

    // Save session info (for recovery/resend)
    sessionStorage.setItem("otpPhone", phone);
    sessionStorage.setItem("otpSentAt", Date.now().toString());

    console.log("📲 OTP sent successfully to", phone);
    return true;
  } catch (err: any) {
    console.error("❌ OTP send error:", err);
    if (err.code === "auth/invalid-phone-number")
      throw new Error("Invalid phone number format.");
    if (err.code === "auth/too-many-requests")
      throw new Error("Too many attempts. Please wait and try again.");
    if (err.code === "auth/network-request-failed")
      throw new Error("Network error. Check your connection or domain settings.");
    throw new Error("Failed to send OTP. Please try again.");
  }
};

/* =====================================================
   ✅ Verify OTP
===================================================== */
export const verifyOtp = async (otp: string) => {
  if (typeof window === "undefined") throw new Error("Cannot verify OTP server-side.");
  if (!otp?.trim()) throw new Error("Enter OTP first.");
  if (!confirmationResult) throw new Error("OTP session expired. Please resend OTP.");

  const sentAt = parseInt(sessionStorage.getItem("otpSentAt") || "0");
  const fifteenMins = 15 * 60 * 1000;
  if (Date.now() - sentAt > fifteenMins)
    throw new Error("OTP expired. Please resend.");

  try {
    console.log("🔐 Verifying OTP...");
    const result = await confirmationResult.confirm(otp.trim());
    if (!result?.user) throw new Error("Invalid OTP response.");

    console.log("✅ OTP verified for:", result.user.phoneNumber);
    clearOtpSession();
    return result.user;
  } catch (err: any) {
    console.error("❌ OTP verification error:", err);
    if (err.code?.includes("expired") || err.message?.includes("expired")) {
      throw new Error("OTP expired. Please resend.");
    }
    throw new Error("Invalid OTP. Please try again.");
  }
};

/* =====================================================
   🔁 Resend OTP (recreates reCAPTCHA & sends again)
===================================================== */
export const resendOtp = async (phone?: string): Promise<boolean> => {
  if (typeof window === "undefined") throw new Error("Cannot resend OTP server-side.");

  const storedPhone = phone || sessionStorage.getItem("otpPhone");
  if (!storedPhone) throw new Error("No phone number found for resend.");

  console.log("♻️ Resending OTP to", storedPhone);

  // Always reset old OTP session and re-init reCAPTCHA
  clearOtpSession();
  initRecaptcha();

  try {
    confirmationResult = await signInWithPhoneNumber(auth, storedPhone, recaptchaVerifier!);
    sessionStorage.setItem("otpPhone", storedPhone);
    sessionStorage.setItem("otpSentAt", Date.now().toString());
    console.log("📲 OTP resent successfully to", storedPhone);
    return true;
  } catch (err: any) {
    console.error("❌ Resend OTP error:", err);
    if (err.code === "auth/too-many-requests")
      throw new Error("Too many attempts. Please wait before resending.");
    throw new Error("Failed to resend OTP. Try again.");
  }
};

/* =====================================================
   🧹 Cleanup OTP Session
===================================================== */
export const clearOtpSession = () => {
  recaptchaVerifier = null;
  confirmationResult = null;
  sessionStorage.removeItem("otpPhone");
  sessionStorage.removeItem("otpSentAt");
  console.log("🧹 OTP session cleared.");
};
