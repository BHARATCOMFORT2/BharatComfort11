"use client";

import { useEffect, useRef, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  sendEmailVerification,
  RecaptchaVerifier,
  linkWithPhoneNumber,
  sendPasswordResetEmail,
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
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [otpCountdown, setOtpCountdown] = useState(0);

  const recaptchaDivRef = useRef<HTMLDivElement | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<any>(null);

  // Hardcoded Admin & Staff accounts
  const adminEmails = ["shrrajbhar12340@gmail.com", "founder@bharatcomfort.in"];
  const staffEmails = ["staff@bharatcomfort.in", "support@bharatcomfort.in"];

  /* ----------------------------------------------------------
     🔐 Load user + Firestore profile
  ---------------------------------------------------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setProfile(data);
          setPhone(data.phone || u.phoneNumber || "");

          // ✅ Auto-verify Admin
          if (adminEmails.includes(u.email!)) {
            await updateDoc(ref, { emailVerified: true, phoneVerified: true, role: "admin" });
            setMsg("🔐 Admin verified automatically.");
            router.push("/(dashboard)/admin");
            return;
          }

          // ⚙️ Force staff password reset
          if (staffEmails.includes(u.email!)) {
            await sendPasswordResetEmail(auth, u.email!);
            setMsg("⚙️ Staff detected. Password reset email sent. Please reset before proceeding.");
          }
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
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaDivRef.current, {
        size: "invisible",
      });
      recaptchaVerifierRef.current.render();
    }
  }, []);

  /* ----------------------------------------------------------
     ⏱️ Countdown timers
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
     ✉️ Send Email Verification
  ---------------------------------------------------------- */
  const handleSendVerification = async () => {
    if (!auth.currentUser) return;
    if (emailCountdown > 0) return setMsg("Please wait before resending.");
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      await sendEmailVerification(auth.currentUser, { url: `${appUrl}/auth/verify` });
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        emailExpiry: Date.now() + 10 * 60 * 1000,
      });
      setEmailCountdown(60);
      setMsg("📩 Verification email sent!");
    } catch (err: any) {
      console.error(err);
      setMsg("Failed to send verification email.");
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
      if (updatedUser.emailVerified) {
        await updateDoc(doc(db, "users", updatedUser.uid), { emailVerified: true });
        setProfile((prev: any) => ({ ...prev, emailVerified: true }));
        setMsg("✅ Email verified successfully!");
      } else setMsg("⏳ Still not verified. Check your inbox.");
    } catch (err: any) {
      console.error(err);
      setMsg("Failed to refresh status.");
    }
  };

  /* ----------------------------------------------------------
     📱 Send OTP
  ---------------------------------------------------------- */
  const handleSendOtp = async () => {
    if (!auth.currentUser) return setMsg("Please login again.");
    if (!/^\+?\d{10,15}$/.test(phone)) return setMsg("Enter valid phone number.");
    if (otpCountdown > 0) return setMsg("Wait before resending OTP.");
    setLoading(true);
    try {
      confirmationResultRef.current = await linkWithPhoneNumber(
        auth.currentUser!,
        phone.trim(),
        recaptchaVerifierRef.current!
      );
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        otpExpiry: Date.now() + 10 * 60 * 1000,
      });
      setOtpCountdown(30);
      setMsg("📲 OTP sent successfully!");
    } catch (err: any) {
      console.error("Send OTP error:", err);
      setMsg("Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------------
     ✅ Verify OTP
  ---------------------------------------------------------- */
  const handleVerifyOtp = async () => {
    if (!otp.trim()) return setMsg("Enter OTP first.");
    if (!confirmationResultRef.current) return setMsg("OTP expired. Resend.");
    setLoading(true);
    try {
      const result = await confirmationResultRef.current.confirm(otp.trim());
      await updateDoc(doc(db, "users", result.user.uid), { phoneVerified: true, phone });
      setProfile((p: any) => ({ ...p, phoneVerified: true }));
      setMsg("✅ Phone verified successfully!");
    } catch (err: any) {
      console.error("OTP verify error:", err);
      setMsg("Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------------
     🚀 Auto Redirect based on Role
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!user || !profile) return;

    if (profile.emailVerified && profile.phoneVerified) {
      // Partner logic — wait for KYC approval
      if (profile.role === "partner") {
        if (profile.kyc?.status === "approved" || profile.status === "approved") {
          router.push("/(dashboard)/partner");
        } else {
          setMsg("⏳ KYC verification pending. Please complete or wait for approval.");
          return;
        }
      }

      // Staff redirect
      if (profile.role === "staff") router.push("/(dashboard)/staff");
      // Admin redirect
      if (profile.role === "admin") router.push("/(dashboard)/admin");
      // User redirect
      if (profile.role === "user" || !profile.role) router.push("/(dashboard)/user");
    }
  }, [user, profile]);

  /* ----------------------------------------------------------
     🚫 Not Logged In
  ---------------------------------------------------------- */
  if (!user)
    return (
      <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded shadow text-center">
        <h1 className="text-xl font-bold text-gray-800 mb-2">Not Logged In</h1>
        <p className="text-gray-600">Please log in or register first.</p>
      </div>
    );

  const emailVerified = profile?.emailVerified || user.emailVerified;
  const phoneVerified = profile?.phoneVerified || user.phoneNumber;

  /* ----------------------------------------------------------
     🧠 UI
  ---------------------------------------------------------- */
  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded shadow space-y-6">
      <h1 className="text-2xl font-bold text-center text-gray-800">
        Verify Your Account
      </h1>

      {/* EMAIL SECTION */}
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
              {emailCountdown > 0 ? `Resend in ${emailCountdown}s` : "Send Email"}
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

      {/* PHONE SECTION */}
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
