"use client";

import { useState, useRef } from "react";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from "firebase/auth";
import { loginUser, registerUser } from "@/lib/auth";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  bookingCallback?: () => void; // 🧠 Automatically trigger booking after login
}

export default function LoginModal({
  isOpen,
  onClose,
  onSuccess,
  bookingCallback,
}: LoginModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmResult, setConfirmResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const recaptchaContainer = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  /* -------------------------------
     EMAIL/PASSWORD AUTH
  --------------------------------*/
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await loginUser(email, password);
      } else {
        await registerUser(email, password, name);
      }

      onAuthStateChanged(auth, (user) => {
        if (user) {
          onSuccess?.();
          onClose();
          bookingCallback?.(); // 🧠 Auto-continue booking
        }
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------
     GOOGLE AUTH
  --------------------------------*/
  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onSuccess?.();
      onClose();
      bookingCallback?.();
    } catch (err: any) {
      console.error("Google Login Failed:", err);
      alert("Google login failed");
    }
  };

  /* -------------------------------
     PHONE OTP AUTH
  --------------------------------*/
  const handleSendOTP = async () => {
    if (!phone) return alert("Enter your phone number");
    try {
      const recaptcha = new RecaptchaVerifier(auth, recaptchaContainer.current!, {
        size: "invisible",
      });
      const result = await signInWithPhoneNumber(auth, phone, recaptcha);
      setConfirmResult(result);
      alert("OTP sent!");
    } catch (err: any) {
      console.error("OTP send error:", err);
      alert("Failed to send OTP");
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || !confirmResult) return alert("Enter OTP first");
    try {
      await confirmResult.confirm(otp);
      onSuccess?.();
      onClose();
      bookingCallback?.();
    } catch (err: any) {
      console.error("OTP verification error:", err);
      alert("Invalid OTP");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md space-y-4 relative">
        <h2 className="text-xl font-semibold text-center">
          {mode === "login" ? "Login to Continue" : "Create an Account"}
        </h2>

        {/* 📧 Email Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          {mode === "register" && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg p-2"
              required
            />
          )}

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg p-2"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg p-2"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-lg"
          >
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
          </button>
        </form>

        {/* 🔁 OR divider */}
        <div className="flex items-center my-3">
          <div className="flex-1 border-t border-gray-300"></div>
          <p className="mx-2 text-gray-400 text-sm">OR</p>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* 🌐 Google Login */}
        <button
          onClick={handleGoogleLogin}
          className="w-full bg-white border text-gray-700 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
        >
          <img src="/icons/google.svg" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>

        {/* 📱 Phone OTP */}
        <div className="space-y-2">
          {!confirmResult ? (
            <>
              <input
                type="tel"
                placeholder="+91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border rounded-lg p-2"
              />
              <button
                onClick={handleSendOTP}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
              >
                Send OTP
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full border rounded-lg p-2"
              />
              <button
                onClick={handleVerifyOTP}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg"
              >
                Verify OTP
              </button>
            </>
          )}
          <div ref={recaptchaContainer}></div>
        </div>

        <p className="text-center text-sm text-gray-500">
          {mode === "login" ? "New user?" : "Already have an account?"}{" "}
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="text-blue-600 underline"
          >
            {mode === "login" ? "Create one" : "Login"}
          </button>
        </p>

        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
