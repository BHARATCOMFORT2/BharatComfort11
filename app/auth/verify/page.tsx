"use client";

import { useEffect, useRef, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  sendEmailVerification,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function VerifyPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  // countdowns
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [otpCountdown, setOtpCountdown] = useState(0);

  const recaptchaDivRef = useRef<HTMLDivElement | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<import("firebase/auth").ConfirmationResult | null>(null);

  /* ----------------------------------------------------------
     🔐 Load user + profile
  ---------------------------------------------------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          const data = snap.data();
          setProfile(data);
          setPhone(data.phone || u.phoneNumber || "");
        }
      }
    });
    return () => unsub();
  }, []);

  /* ----------------------------------------------------------
     ✅ Initialize reCAPTCHA
  ---------------------------------------------------------- */
  useEffect(() => {
    if (typeof window !== "undefined" && !recaptchaVerifierRef.current && recaptchaDivRef.current) {
      try {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaDivRef.current, {
          size: "invisible",
        });
        recaptchaVerifierRef.current.render();
        console.log("✅ reCAPTCHA initialized");
      } catch {
        console.warn("⚠️ reCAPTCHA already initialized");
      }
    }
  }, []);

  /* ----------------------------------------------------------
     ⏱️ Countdown timer hooks
  ---------------------------------------------------------- */
  useEffect(() => {
    if (emailCountdown <= 0) return;
    const interval = setInterval(() => setEmailCountdown((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [emailCountdown]);

  useEffect(() => {
    if (otpCountdown <= 0) return;
    const interval = setInterval(() => setOtpCountdown((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [otpCountdown]);

  /* ----------------------------------------------------------
     ✉️ Send Email Verification (with cooldown)
  ---------------------------------------------------------- */
  const handleSendVerification = async () => {
    if (!auth.currentUser) return;
    if (emailCountdown > 0) return setMsg("Please wait before resending.");

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      await sendEmailVerification(auth.currentUser, { url: `${appUrl}/auth/verify` });

      // reset expiry + cooldown
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        emailExpiry: Date.now() + 10 * 60 * 1000,
      });

      setEmailCountdown(60); // 60-second cooldown
      setMsg("📩 Verification email sent! Check your inbox.");
    } catch (err: any) {
      console.error("Email verification error:", err);
      setMsg(err.message || "Failed to send verification email.");
    }
  };

  /* ----------------------------------------------------------
     🔁 Refresh Email Verification
  ---------------------------------------------------------- */
  const handleRefreshStatus = async () => {
    try {
      await auth.currentUser?.reload();
      const updatedUser = auth.currentUser;
      if (!updatedUser) return;

      const snap = await getDoc(doc(db, "users", updatedUser.uid));
      if (snap.exists()) {
        const data = snap.data();
        if (data.emailExpiry && Date.now() > data.emailExpiry) {
          setMsg("⏳ Email verification link expired. Please resend.");
          return;
        }
      }

      if (updatedUser.emailVerified) {
        await updateDoc(doc(db, "users", updatedUser.uid), { emailVerified: true });
        setMsg("✅ Email verified successfully!");
      } else {
        setMsg("⏳ Still not verified. Check your inbox.");
      }

      setUser(updatedUser);
      setProfile((prev: any) => ({ ...prev, emailVerified: updatedUser.emailVerified }));
    } catch (err: any) {
      console.error("Refresh error:", err);
      setMsg(err.message || "Failed to refresh verification status.");
    }
  };

  /* ----------------------------------------------------------
     📱 Send OTP (with cooldown)
  ---------------------------------------------------------- */
  const handleSendOtp = async () => {
    if (otpCountdown > 0) return setMsg("Please wait before resending OTP.");
    if (!auth.currentUser) return setMsg("Please login again.");
    if (!/^\+?\d{10,15}$/.test(phone))
      return setMsg("Enter valid phone number (e.g. +919876543210)");

    setLoading(true);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        otpExpiry: Date.now() + 10 * 60 * 1000,
      });

      confirmationResultRef.current = await signInWithPhoneNumber(
        auth,
        phone.trim(),
        recaptchaVerifierRef.current!
      );

      setOtpCountdown(30); // 30-second resend cooldown
      setMsg("📲 OTP sent successfully! Valid for 10 minutes.");
    } catch (err: any) {
      console.error("Send OTP error:", err);
      setMsg(err.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------------
     ✅ Verify OTP (check expiry)
  ---------------------------------------------------------- */
  const handleVerifyOtp = async () => {
    if (!otp.trim()) return setMsg("Enter OTP first.");
    if (!confirmationResultRef.current) return setMsg("OTP session expired.");

    setLoading(true);
    try {
      const userRef = doc(db, "users", auth.currentUser!.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.otpExpiry && Date.now() > data.otpExpiry) {
          setMsg("⏳ OTP expired. Please resend.");
          return;
        }
      }

      await confirmationResultRef.current.confirm(otp.trim());
      await updateDoc(userRef, { phoneVerified: true, phone });
      setMsg("✅ Phone verified successfully!");
      setProfile((prev: any) => ({ ...prev, phoneVerified: true }));
    } catch (err: any) {
      console.error("OTP verify error:", err);
      setMsg("Invalid or expired OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------------
     🚀 Auto Redirect
  ---------------------------------------------------------- */
  useEffect(() => {
    if (user && profile?.emailVerified && profile?.phoneVerified) {
      const timer = setTimeout(() => router.push("/(dashboard)/user"), 1500);
      return () => clearTimeout(timer);
    }
  }, [user, profile]);

  /* ----------------------------------------------------------
     🚫 Not logged in
  ---------------------------------------------------------- */
  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded shadow">
        <h1 className="text-xl font-bold text-gray-800 mb-2">Not Logged In</h1>
        <p className="text-gray-600">Please log in or register first.</p>
      </div>
    );
  }

  const emailVerified = profile?.emailVerified || user.emailVerified;
  const phoneVerified = Boolean(profile?.phoneVerified || user.phoneNumber);

  /* ----------------------------------------------------------
     🧠 UI
  ---------------------------------------------------------- */
  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded shadow space-y-6">
      <h1 className="text-2xl font-bold text-center text-gray-800">
        Verify Your Account
      </h1>

      {/* EMAIL */}
      {!emailVerified ? (
        <div className="p-4 border rounded bg-yellow-50 space-y-2">
          <p>Your email <b>{user.email}</b> is not verified yet.</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleSendVerification}
              disabled={emailCountdown > 0}
              className={`px-4 py-2 rounded text-white ${
                emailCountdown > 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {emailCountdown > 0
                ? `Resend in ${emailCountdown}s`
                : "Resend Verification Email"}
            </button>

            <button
              onClick={handleRefreshStatus}
              className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-black/90 transition"
            >
              Refresh
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 border rounded bg-green-50">✅ Email verified.</div>
      )}

      {/* PHONE */}
      {!phoneVerified ? (
        <div className="p-4 border rounded bg-yellow-50 space-y-3">
          <p className="font-medium text-gray-800">Verify your phone number:</p>

          <input
            className="w-full border rounded p-2"
            placeholder="+919876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleSendOtp}
              disabled={otpCountdown > 0 || loading}
              className={`px-4 py-2 rounded text-white ${
                otpCountdown > 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gray-800 hover:bg-black/90"
              }`}
            >
              {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : "Send OTP"}
            </button>

            <input
              className="flex-1 border rounded p-2"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />

            <button
              onClick={handleVerifyOtp}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </div>

          <div ref={recaptchaDivRef} />
        </div>
      ) : (
        <div className="p-4 border rounded bg-green-50">
          ✅ Phone {profile?.phone || user.phoneNumber} verified.
        </div>
      )}

      {msg && (
        <p className="text-sm text-gray-700 text-center bg-gray-100 p-2 rounded">
          {msg}
        </p>
      )}
    </div>
  );
}
