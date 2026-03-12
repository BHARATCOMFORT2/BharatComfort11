import { auth } from "@/lib/firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";

let confirmationResult: ConfirmationResult | null = null;

/* ==========================================
   🔐 Initialize reCAPTCHA
========================================== */
export const initRecaptcha = async (containerId = "recaptcha-container") => {
  if (typeof window === "undefined") return;

  if ((window as any).recaptchaVerifier) return;

  const container = document.getElementById(containerId);
  if (!container) throw new Error("reCAPTCHA container missing");

  const verifier = new RecaptchaVerifier(auth, container, {
    size: "invisible",
    callback: () => console.log("✅ reCAPTCHA solved"),
  });

  await verifier.render();

  (window as any).recaptchaVerifier = verifier;
};

/* ==========================================
   📲 Send OTP
========================================== */
export const sendOtp = async (phone: string) => {
  if (!phone) throw new Error("Phone number missing");

  const formattedPhone = phone.startsWith("+")
    ? phone
    : `+${phone.replace(/\D/g, "")}`;

  await initRecaptcha();

  const verifier = (window as any).recaptchaVerifier;

  confirmationResult = await signInWithPhoneNumber(
    auth,
    formattedPhone,
    verifier
  );

  sessionStorage.setItem("otpPhone", formattedPhone);
  sessionStorage.setItem("otpSentAt", Date.now().toString());

  return true;
};

/* ==========================================
   ✅ Verify OTP
========================================== */
export const verifyOtp = async (otp: string) => {
  if (!confirmationResult) {
    throw new Error("OTP session expired");
  }

  const sentAt = Number(sessionStorage.getItem("otpSentAt") || 0);

  if (Date.now() - sentAt > 10 * 60 * 1000) {
    throw new Error("OTP expired");
  }

  const result = await confirmationResult.confirm(otp.trim());

  clearOtpSession();

  return result.user;
};

/* ==========================================
   🔁 Resend OTP
========================================== */
export const resendOtp = async () => {
  const phone = sessionStorage.getItem("otpPhone");

  if (!phone) throw new Error("No phone for resend");

  return sendOtp(phone);
};

/* ==========================================
   🧹 Cleanup
========================================== */
export const clearOtpSession = () => {
  confirmationResult = null;
  sessionStorage.removeItem("otpPhone");
  sessionStorage.removeItem("otpSentAt");
};
