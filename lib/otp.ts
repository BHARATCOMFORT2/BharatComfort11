import { auth } from "@/lib/firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";

let recaptchaVerifier: RecaptchaVerifier | null = null;
let confirmationResult: ConfirmationResult | null = null;

/* ==========================================
   🔐 Initialize reCAPTCHA (SAFE)
========================================== */
export const initRecaptcha = async (containerId = "recaptcha-container") => {
  if (typeof window === "undefined") return;

  // ✅ If already initialized, reuse
  if (recaptchaVerifier) {
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error("reCAPTCHA container not found");
  }

  recaptchaVerifier = new RecaptchaVerifier(auth, container, {
    size: "invisible",
    callback: () => console.log("✅ reCAPTCHA solved"),
    "expired-callback": () => {
      console.warn("⚠️ reCAPTCHA expired");
      clearOtpSession();
    },
  });

  await recaptchaVerifier.render();
};

/* ==========================================
   📲 Send OTP (FIXED)
========================================== */
export const sendOtp = async (phone: string): Promise<boolean> => {
  if (typeof window === "undefined") {
    throw new Error("OTP cannot be sent server-side");
  }

  if (!phone) throw new Error("Phone number missing");

  // ✅ Normalize phone (VERY IMPORTANT)
  const raw = phone.replace(/\D/g, "");
  const clean = raw.startsWith("0") ? raw.slice(1) : raw;
  const finalPhone = phone.startsWith("+") ? phone : `+${clean}`;

  try {
    await initRecaptcha();

    confirmationResult = await signInWithPhoneNumber(
      auth,
      finalPhone,
      recaptchaVerifier!
    );

    sessionStorage.setItem("otpPhone", finalPhone);
    sessionStorage.setItem("otpSentAt", Date.now().toString());
    return true;
  } catch (err: any) {
    console.error("❌ OTP SEND ERROR:", err);
    throw err;
  }
};

/* ==========================================
   ✅ Verify OTP
========================================== */
export const verifyOtp = async (otp: string) => {
  if (!confirmationResult) {
    throw new Error("OTP session expired. Please resend.");
  }

  const sentAt = Number(sessionStorage.getItem("otpSentAt") || 0);
  if (Date.now() - sentAt > 10 * 60 * 1000) {
    throw new Error("OTP expired.");
  }

  try {
    const result = await confirmationResult.confirm(otp.trim());
    clearOtpSession();
    return result.user;
  } catch (err: any) {
    console.error("❌ OTP VERIFY ERROR:", err);
    throw err;
  }
};

/* ==========================================
   🔁 Resend OTP (FIXED)
========================================== */
export const resendOtp = async (): Promise<boolean> => {
  const phone = sessionStorage.getItem("otpPhone");
  if (!phone) throw new Error("No phone to resend OTP");

  clearOtpSession();
  await initRecaptcha();

  confirmationResult = await signInWithPhoneNumber(
    auth,
    phone,
    recaptchaVerifier!
  );

  sessionStorage.setItem("otpPhone", phone);
  sessionStorage.setItem("otpSentAt", Date.now().toString());
  return true;
};

/* ==========================================
   🧹 Proper Cleanup (CRITICAL FIX)
========================================== */
export const clearOtpSession = () => {
  try {
    if (recaptchaVerifier) {
      recaptchaVerifier.clear(); // ✅ VERY IMPORTANT
    }
  } catch {}

  recaptchaVerifier = null;
  confirmationResult = null;
  sessionStorage.removeItem("otpPhone");
  sessionStorage.removeItem("otpSentAt");
};
