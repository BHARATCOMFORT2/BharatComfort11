"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { sendOtp, verifyOtp, resendOtp, clearOtpSession, initRecaptcha } from "@/lib/otp";

export default function VerifyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [step, setStep] = useState<"phone" | "email">("phone");

  const [otpCountdown, setOtpCountdown] = useState(0);
  const [emailCountdown, setEmailCountdown] = useState(0);

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
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        setPhone(data.phone || u.phoneNumber || "");
      }

      // 🧩 Admin auto verify
      if (adminEmails.includes(u.email!)) {
        if (snap.exists()) {
          await updateDoc(ref, {
            emailVerified: true,
            phoneVerified: true,
            verified: true,
            role: "admin",
          });
        }
        setMsg("🔐 Admin auto-verified.");
        router.push("/dashboard/admin");
        return;
      }

      // 🧩 Staff: force password reset
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
    if (otpCountdown <= 0) return;
    const t = setInterval(() => setOtpCountdown((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, [otpCountdown]);

  useEffect(() => {
    if (emailCountdown <= 0) return;
    const t = setInterval(() => setEmailCountdown((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, [emailCountdown]);

  /* --------------------------------------------------
     📱 Phone OTP
  -------------------------------------------------- */
  const handleSendOtp = async () => {
    if (!auth.currentUser) return setMsg("Please login again.");
    if (!/^\+?\d{10,15}$/.test(phone)) return setMsg("Enter a valid phone number.");
    if (otpCountdown > 0) return setMsg("Wait before resending OTP.");

    setLoading(true);
    try {
      await sendOtp(phone.trim());
      setOtpCountdown(60);
      setMsg("📲 OTP sent successfully!");
    } catch (err: any) {
      console.error("Send OTP error:", err);
      setMsg(err.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!otp.trim()) return setMsg("Enter OTP first.");
    setLoading(true);
    try {
      const verifiedUser = await verifyOtp(otp.trim());
      if (!verifiedUser?.uid) throw new Error("Invalid OTP.");

      const ref = doc(db, "users", verifiedUser.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          uid: verifiedUser.uid,
          email: verifiedUser.email,
          phone,
          phoneVerified: true,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(ref, { phoneVerified: true, verified: true, phone });
      }

      clearOtpSession();
      setOtp("");
      setMsg("✅ Phone verified! Now verify your email.");
      setStep("email");

      // Send email OTP
      const res = await fetch("/api/auth/send-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifiedUser.email }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setEmailCountdown(60);
    } catch (err: any) {
      console.error("OTP verify error:", err);
      setMsg(err.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------
     ✉️ Email OTP
  -------------------------------------------------- */
  const handleVerifyEmailOtp = async () => {
    if (!emailOtp.trim()) return setMsg("Enter email OTP first.");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, otp: emailOtp }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, {
        emailVerified: true,
        verified: true,
      });

      setMsg("✅ Email verified successfully!");
      router.push("/dashboard/user");
    } catch (err: any) {
      console.error("Email verify error:", err);
      setMsg(err.message || "Email OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------
     🚀 Redirect after verification
  -------------------------------------------------- */
  useEffect(() => {
    if (!user || !profile) return;
    if (profile.emailVerified && profile.phoneVerified) {
      switch (profile.role) {
        case "admin":
          router.push("/dashboard/admin");
          break;
        case "partner":
          if (profile.status === "approved" || profile.kyc?.status === "approved")
            router.push("/dashboard/partner");
          else setMsg("⏳ KYC pending admin approval.");
          break;
        case "staff":
          router.push("/dashboard/staff");
          break;
        default:
          router.push("/dashboard/user");
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

  const phoneVerified = profile?.phoneVerified || !!user.phoneNumber;
  const emailVerified = profile?.emailVerified;

  /* --------------------------------------------------
     🖼️ UI
  -------------------------------------------------- */
  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded shadow space-y-6">
      <h1 className="text-2xl font-bold text-center text-gray-800">
        Verify Your Account
      </h1>

      {msg && (
        <p className="text-sm text-gray-700 text-center bg-gray-100 p-2 rounded">
          {msg}
        </p>
      )}

      {/* PHONE SECTION */}
      {!phoneVerified && step === "phone" && (
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
              onClick={handleVerifyPhoneOtp}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </div>
          <div id="recaptcha-container" />
        </div>
      )}

      {/* EMAIL SECTION */}
      {!emailVerified && step === "email" && (
        <div className="p-4 border rounded bg-yellow-50 space-y-3">
          <p className="font-medium text-gray-800">
            Verify your email: <b>{user.email}</b>
          </p>
          <input
            className="w-full border rounded p-2"
            placeholder="Enter Email OTP"
            value={emailOtp}
            onChange={(e) => setEmailOtp(e.target.value)}
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleVerifyEmailOtp}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {loading ? "Verifying..." : "Verify Email OTP"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
