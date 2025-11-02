// lib/email-otp.ts
import nodemailer from "nodemailer";

type OtpEntry = { otp: string; expires: number };
const otpStore = new Map<string, OtpEntry>(); // temporary in-memory storage

/**
 * 📨 Send OTP to user email
 */
export async function sendEmailOtp(email: string) {
  if (!email) throw new Error("Email is required.");

  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

  otpStore.set(email, { otp, expires });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER!,
      pass: process.env.EMAIL_PASS!,
    },
  });

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 10px;">
      <h2>BHARATCOMFORT11 Email Verification</h2>
      <p>Your OTP is:</p>
      <h1 style="letter-spacing: 5px;">${otp}</h1>
      <p>This OTP will expire in <b>10 minutes</b>.</p>
      <p style="color: #666;">If you didn’t request this, you can ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"BHARATCOMFORT11" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Email OTP Code",
    html,
  });

  console.log("📧 Sent email OTP to:", email);
  return true;
}

/**
 * ✅ Verify Email OTP
 */
export async function verifyEmailOtp(email: string, otp: string) {
  const entry = otpStore.get(email);
  if (!entry) throw new Error("OTP not found. Please request again.");
  if (Date.now() > entry.expires) {
    otpStore.delete(email);
    throw new Error("OTP expired. Please request a new one.");
  }
  if (entry.otp !== otp.trim()) throw new Error("Invalid OTP.");

  otpStore.delete(email);
  return true;
}
