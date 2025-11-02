"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sendOtp, verifyOtp, resendOtp, clearOtpSession, initRecaptcha } from "@/lib/otp";

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

  const adminEmails = ["shrrajbhar12340@gmail.com", "founder@bharatcomfort.in"];
  const staffEmails = ["staff@bharatcomfort.in", "support@bharatcomfort.in"];

  /* --------------------------------------------------
     🔐 Watch Auth State & Load Profile
  -------------------------------------------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return setUser(null);
      setUser(u);

      const ref = doc(db, "users", u.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;

      const data = snap.data();
      setProfile(data);
      setPhone(data.phone || u.phoneNumber || "");

      // Auto-verify admin
      if (adminEmails.includes(u.email!)) {
        await updateDoc(ref, {
          emailVerified: true,
          phoneVerified: true,
          verified: true,
          role: "admin",
        });
        setMsg("🔐 Admin verified automatically.");
        router.push("/(dashboard)/admin");
        return;
      }

      // Staff: force password reset
      if (staffEmails.includes(u.email!)) {
        await sendPasswordResetEmail(auth, u.email!);
        setMsg("⚙️ Staff detected. Password reset email sent.");
      }
    });
    return () => unsub();
  }, []);

  /* --------------------------------------------------
     🧩 Init reCAPTCHA for OTP
  -------------------------------------------------- */
  useEffect(() => {
    initRecaptcha("recaptcha-container");
  }, []);

  /* --------------------------------------------------
     ⏱️ Countdown timers
  -------------------------------------------------- */
  useEffect(() => {
    if (emailCountdown <= 0) return;
    const t = setInterval(() => setEmailCountdown((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, [emailCountdown]);

  useEffect(() => {
    if (otpCountdown <= 0) return;
    const t = setInterval(() => setOtpCountdown((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, [otpCountdown]);

  /* --------------------------------------------------
     ✉️ Email Verification
  -------------------------------------------------- */
  const handleSendVerification = async () => {
    if (!auth.currentUser) return;
    if (emailCountdown > 0) return setMsg("Wait before resending.");
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      await sendEmailVerification(auth.currentUser, { url: `${appUrl}/auth/verify` });
      setEmailCountdown(60);
      setMsg("📩 Verification email sent!");
    } catch {
      setMsg("Failed to send verification email.");
    }
  };

  const handleRefreshStatus = async () => {
    try {
      await auth.currentUser?.reload();
      const u = auth.currentUser;
      if (!u) return;
      if (u.emailVerified) {
        await updateDoc(doc(db, "users", u.uid), { emailVerified: true });
        setProfile((p: any) => ({ ...p, emailVerified: true }));
        setMsg("✅ Email verified successfully!");
      } else setMsg("⏳ Still not verified. Check your inbox.");
    } catch {
      setMsg("Failed to refresh status.");
    }
  };

  /* --------------------------------------------------
     📱 Phone OTP using shared module
  -------------------------------------------------- */
  const handleSendOtp = async () => {
    if (!auth.currentUser) return setMsg("Please login again.");
    if (!/^\+?\d{10,15}$/.test(phone)) return setMsg("Enter valid phone number.");
    if (otpCountdown > 0) return setMsg("Wait before resending OTP.");
    setLoading(true);
    try {
      await sendOtp(phone.trim());
      setOtpCountdown(30);
      setMsg("📲 OTP sent successfully!");
    } catch (err: any) {
      console.error("Send OTP error:", err);
      setMsg(err.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) return setMsg("Enter OTP first.");
    setLoading(true);
    try {
      const verifiedUser = await verifyOtp(otp.trim());
      if (verifiedUser?.uid) {
        await updateDoc(doc(db, "users", verifiedUser.uid), {
          phoneVerified: true,
          verified: true,
          phone,
        });
        clearOtpSession();
        setProfile((p: any) => ({ ...p, phoneVerified: true }));
        setMsg("✅ Phone verified successfully!");
      }
    } catch (err: any) {
      console.error("OTP verify error:", err);
      setMsg(err.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      await resendOtp(phone.trim());
      setOtpCountdown(30);
      setMsg("📲 New OTP sent!");
    } catch {
      setMsg("Failed to resend OTP.");
    }
  };

  /* --------------------------------------------------
     🚀 Redirect when verified
  -------------------------------------------------- */
  useEffect(() => {
    if (!user || !profile) return;
    if (profile.emailVerified && profile.phoneVerified) {
      switch (profile.role) {
        case "admin":
          router.push("/(dashboard)/admin");
          break;
        case "partner":
          if (profile.status === "approved" || profile.kyc?.status === "approved")
            router.push("/(dashboard)/partner");
          else setMsg("⏳ KYC pending approval.");
          break;
        case "staff":
          router.push("/(dashboard)/staff");
          break;
        default:
          router.push("/(dashboard)/user");
      }
    }
  }, [profile]);

  if (!user)
    return (
      <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded shadow text-center">
        <h1 className="text-xl font-bold text-gray-800 mb-2">Not Logged In</h1>
        <p className="text-gray-600">Please log in or register first.</p>
      </div>
    );

  const emailVerified = profile?.emailVerified || user.emailVerified;
  const phoneVerified = profile?.phoneVerified || !!user.phoneNumber;

  /* --------------------------------------------------
     🖼️ UI
  -------------------------------------------------- */
  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded shadow space-y-6">
      <h1 className="text-2xl font-bold text-center text-gray-800">
        Verify Your Account
      </h1>

      {/* EMAIL SECTION */}
      {!emailVerified ? (
        <div className="p-4 border rounded bg-yellow-50 space-y-2">
          <p>Your email <b>{user.email}</b> is not verified.</p>
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
                : "Send Verification Email"}
            </button>
            <button
              onClick={handleRefreshStatus}
              className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-black/90"
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
          <p className="font-medium text-gray-800">Verify your phone:</p>
          <input
            className="w-full border rounded p-2"
            placeholder="+919876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={otpCountdown > 0 ? handleResendOtp : handleSendOtp}
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
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </div>
          <div id="recaptcha-container" />
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
