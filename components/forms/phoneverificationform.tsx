"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

export default function PhoneVerificationForm({ onVerified }: { onVerified: () => void }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  function setupRecaptcha() {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        "recaptcha-container",
        { size: "invisible" },
        auth
      );
    }
  }

  async function sendOtp() {
    setupRecaptcha();
    const appVerifier = window.recaptchaVerifier;
    const result = await signInWithPhoneNumber(auth, phone, appVerifier);
    setConfirmationResult(result);
    alert("OTP sent!");
  }

  async function verifyOtp() {
    if (confirmationResult) {
      await confirmationResult.confirm(otp);
      alert("Phone verified successfully!");
      onVerified();
    }
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+91 9876543210"
        className="border p-2 rounded w-full"
      />
      <button onClick={sendOtp} className="bg-blue-500 text-white px-4 py-2 rounded">
        Send OTP
      </button>
      <input
        type="text"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="Enter OTP"
        className="border p-2 rounded w-full"
      />
      <button onClick={verifyOtp} className="bg-green-500 text-white px-4 py-2 rounded">
        Verify OTP
      </button>
      <div id="recaptcha-container"></div>
    </div>
  );
}
