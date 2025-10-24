"use client";

import { useState, useRef, useEffect } from "react";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  onAuthStateChanged,
} from "firebase/auth";
import { loginUser, registerUser } from "@/lib/auth";
import { auth } from "@/lib/firebase";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  bookingCallback?: () => void;
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

  /* ------------------------------
     EMAIL/PASSWORD AUTH
  ------------------------------- */
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") await loginUser(email, password);
      else await registerUser(email, password, name);

      onAuthStateChanged(auth, (user) => {
        if (user) {
          onSuccess?.();
          onClose();
          bookingCallback?.();
        }
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------
     GOOGLE AUTH
  ------------------------------- */
  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onSuccess?.();
      onClose();
      bookingCallback?.();
    } catch (err: any) {
      alert("Google login failed");
      console.error("Google login error:", err);
    }
  };

  /* ------------------------------
     PHONE OTP AUTH
  ------------------------------- */
  const handleSendOTP = async () => {
    if (!phone) return alert("Enter your phone number");
    try {
      const recaptcha = new RecaptchaVerifier(auth, recaptchaContainer.current!, {
        size: "invisible",
      });
      const result = await signInWithPhoneNumber(auth, phone, recaptcha);
      setConfirmResult(result);
      alert("OTP sent successfully!");
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
      alert("Invalid OTP");
    }
  };

  /* ------------------------------
     ANIMATION + SOUND
  ------------------------------- */
  useEffect(() => {
    if (isOpen) {
      const chime = new Audio("/chime.mp3");
      chime.volume = 0.4;
      chime.play().catch(() => {});
    }
  }, [isOpen]);

  /* ------------------------------
     UI
  ------------------------------- */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden animate-fadeZoom">
        {/* 🟡 Header with Brand */}
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 py-6 text-center relative">
          <img
            src="/logo.png"
            alt="BharatComfort Logo"
            className="w-20 h-20 mx-auto mb-2 drop-shadow-lg"
          />
          <h2 className="text-xl font-extrabold text-gray-800">
            {mode === "login" ? "Login to Continue" : "Create Your Account"}
          </h2>
          <p className="text-xs text-gray-700">
            Discover comfort in every journey ✈️
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* ✏️ Email/Password Form */}
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
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-lg font-semibold transition"
            >
              {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
            </button>
          </form>

          {/* Divider */}
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

          {/* 🔄 Switch Mode */}
          <p className="text-center text-sm text-gray-600">
            {mode === "login" ? "New user?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="text-yellow-600 font-semibold underline"
            >
              {mode === "login" ? "Register here" : "Login"}
            </button>
          </p>
        </div>

        {/* ✕ Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 text-xl"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
