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
  const [emailSent, setEmailSent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const recaptchaDivRef = useRef<HTMLDivElement | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<import("firebase/auth").ConfirmationResult | null>(null);

  /* ----------------------------------------------------------
     🔐 Load User & Profile
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
     ✅ Initialize Invisible reCAPTCHA
  ---------------------------------------------------------- */
  useEffect(() => {
    if (typeof window !== "undefined" && !recaptchaVerifierRef.current && recaptchaDivRef.current) {
      try {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaDivRef.current, {
          size: "invisible",
        });
        recaptchaVerifierRef.current.render();
        console.log("✅ reCAPTCHA initialized in verify page");
      } catch {
        console.warn("⚠️ reCAPTCHA already initialized");
      }
    }
  }, []);

  /* ----------------------------------------------------------
     ✉️ Send Email Verification
  ---------------------------------------------------------- */
  const handleSendVerification = async () => {
    if (!auth.currentUser) return;
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      await sendEmailVerification(auth.currentUser, { url: `${appUrl}/auth/verify` });

      // 🔹 Reset expiry (10 min)
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        emailExpiry: Date.now() + 10 * 60 * 1000,
      });

      setEmailSent(true);
      setMsg("📩 Verification email sent again! Check your inbox.");
    } catch (err: any) {
      console.error("Email verification error:", err);
      setMsg(err.message || "Failed to send verification email.");
    }
  };

  /* ----------------------------------------------------------
     🔁 Refresh Email Verification Status
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
          setMsg("⏳ Email verification link expired. Please request a new one.");
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
     📱 Send Phone OTP (with 10-minute expiry)
  ---------------------------------------------------------- */
  const handleSendOtp = async () => {
    setMsg(null);
    if (!auth.currentUser) return setMsg("Please login again.");
    if (!/^\+?\d{10,15}$/.test(phone)) {
      return setMsg("Enter a valid phone number (e.g. +919876543210)");
    }

    setLoading(true);
    try {
      if (!recaptchaVerifierRef.current && recaptchaDivRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaDivRef.current, {
          size: "invisible",
        });
        recaptchaVerifierRef.current.render();
      }

      // ⏰ Reset OTP expiry
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        otpExpiry: Date.now() + 10 * 60 * 1000,
      });

      confirmationResultRef.current = await signInWithPhoneNumber(
        auth,
        phone.trim(),
        recaptchaVerifierRef.current!
      );

      setMsg("📲 OTP sent successfully! Valid for 10 minutes.");
    } catch (err: any) {
      console.error("Send OTP error:", err);
      setMsg(err.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------------
     ✅ Verify Phone OTP (with expiry check)
  ---------------------------------------------------------- */
  const handleVerifyOtp = async () => {
    if (!otp.trim()) return setMsg("Enter OTP first.");
    if (!confirmationResultRef.current) return setMsg("OTP session expired. Please resend.");

    setLoading(true);
    try {
      const userRef = doc(db, "users", auth.currentUser!.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        if (data.otpExpiry && Date.now() > data.otpExpiry) {
          setMsg("⏳ OTP expired. Please request a new one.");
          return;
        }
      }

      const result = await confirmationResultRef.current.confirm(otp.trim());
      await updateDoc(userRef, { phoneVerified: true, phone });

      setMsg("✅ Phone verified successfully!");
      setProfile((prev: any) => ({ ...prev, phoneVerified: true }));
    } catch (err: any) {
      console.error("OTP verify error:", err);
      setMsg(err.message || "Invalid OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------------
     🚀 Redirect when both verified
  ---------------------------------------------------------- */
  useEffect(() => {
    if (user && profile?.emailVerified && profile?.phoneVerified) {
      const t = setTimeout(() => router.push("/(dashboard)/user"), 1500);
      return () => clearTimeout(t);
    }
  }, [user, profile]);

  /* ----------------------------------------------------------
     🚫 Not logged in
  ---------------------------------------------------------- */
  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded shadow">
        <h1 className="text-xl font-bold text-gray-800 mb-2">Not Logged In</h1>
        <p className="text-gray-600">Please register or log in first to verify your account.</p>
      </div>
    );
  }

  const emailVerified = profile?.emailVerified || user.emailVerified;
  const phoneVerified = Boolean(profile?.phoneVerified || user.phoneNumber);

  /* ----------------------------------------------------------
     ✅ UI RENDER
  ---------------------------------------------------------- */
  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded shadow space-y-6">
      <h1 className="text-2xl font-bold text-center text-gray-800">
        Verify Your Account
      </h1>

      {/* EMAIL VERIFICATION */}
      {!emailVerified ? (
        <div className="p-4 border rounded bg-yellow-50 space-y-2">
          <p>Your email <b>{user.email}</b> is not verified yet.</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleSendVerification}
              disabled={emailSent}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              {emailSent ? "Verification Sent ✔" : "Resend Verification Email"}
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
        <div className="p-4 border rounded bg-green-50">✅ Your email is verified.</div>
      )}

      {/* PHONE VERIFICATION */}
      {!phoneVerified ? (
        <div className="p-4 border rounded bg-yellow-50 space-y-3">
          <p className="font-medium text-gray-800">Verify your phone number via OTP:</p>

          <input
            className="w-full border rounded p-2"
            placeholder="+919876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-black/90 transition"
            >
              {loading ? "Sending..." : "Send OTP"}
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
