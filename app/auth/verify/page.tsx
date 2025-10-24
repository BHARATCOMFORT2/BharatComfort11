"use client";

import { useEffect, useRef, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  sendEmailVerification,
  linkWithPhoneNumber,
  RecaptchaVerifier,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function VerifyPage() {
  const [user, setUser] = useState<any>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const recaptchaDivRef = useRef<HTMLDivElement | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<import("firebase/auth").ConfirmationResult | null>(null);

  /* ----------------------------------------------------------------
     🧠 Fetch Auth User + Firestore Profile
  ---------------------------------------------------------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setMsg(null);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          const p = snap.data();
          setProfile(p);
          setPhone(p.phone || u.phoneNumber || "");
        }
      }
    });
    return () => unsub();
  }, []);

  /* ----------------------------------------------------------------
     ⚙️ Ensure reCAPTCHA Exists
  ---------------------------------------------------------------- */
  async function ensureRecaptcha() {
    if (recaptchaRef.current) return recaptchaRef.current;
    if (!recaptchaDivRef.current) return null;

    recaptchaRef.current = new RecaptchaVerifier(
      recaptchaDivRef.current,
      { size: "invisible" },
      auth
    );
    await recaptchaRef.current.render();
    return recaptchaRef.current;
  }

  /* ----------------------------------------------------------------
     ✉️ Send Email Verification Link
  ---------------------------------------------------------------- */
  const handleSendVerification = async () => {
    if (!auth.currentUser) return;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

    await sendEmailVerification(auth.currentUser, {
      url: `${appUrl}/auth/verify`,
    });

    setEmailSent(true);
    setMsg("📩 Verification email sent. Please check your inbox.");
  };

  /* ----------------------------------------------------------------
     📱 Start Phone OTP Flow
  ---------------------------------------------------------------- */
  const startPhoneLink = async () => {
    setMsg(null);
    if (!auth.currentUser) return;
    if (!/^\+?\d{10,15}$/.test(phone)) {
      setMsg("Enter a valid phone number with country code, e.g. +919876543210");
      return;
    }

    setLoading(true);
    try {
      const verifier = await ensureRecaptcha();
      if (!verifier) throw new Error("Failed to initialize reCAPTCHA.");

      confirmationRef.current = await linkWithPhoneNumber(
        auth.currentUser,
        phone,
        verifier
      );
      setMsg("📲 OTP sent to your phone.");
    } catch (e: any) {
      console.error("Phone verification error:", e);
      setMsg(e?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------------------
     🔢 Verify Phone OTP
  ---------------------------------------------------------------- */
  const verifyOtp = async () => {
    setMsg(null);
    if (!otp) return setMsg("Enter the OTP.");
    if (!confirmationRef.current) return setMsg("OTP session expired. Send again.");

    setLoading(true);
    try {
      const res = await confirmationRef.current.confirm(otp);

      // ✅ Update Firestore phoneVerified flag
      await updateDoc(doc(db, "users", res.user.uid), {
        phoneVerified: true,
        phone,
      });

      setMsg("✅ Phone number verified successfully.");
    } catch (e: any) {
      console.error("OTP verification failed:", e);
      setMsg(e?.message || "Invalid OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------------------
     🔄 Sync Firestore Flags When Both Verified
  ---------------------------------------------------------------- */
  useEffect(() => {
    if (!user || !profile) return;
    const checkAndMarkVerified = async () => {
      const emailVerified = user.emailVerified;
      const phoneVerified = profile.phoneVerified || !!user.phoneNumber;

      if (emailVerified && phoneVerified) {
        await updateDoc(doc(db, "users", user.uid), {
          emailVerified: true,
          verified: true,
        });
        setMsg("🎉 Both email and phone verified. Your account is now active!");
      }
    };
    checkAndMarkVerified();
  }, [user, profile]);

  /* ----------------------------------------------------------------
     🚫 Not Logged In UI
  ---------------------------------------------------------------- */
  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded shadow">
        <h1 className="text-xl font-bold">Not logged in</h1>
        <p>Please register or log in first.</p>
      </div>
    );
  }

  const emailVerified = user.emailVerified;
  const phoneVerified = Boolean(profile?.phoneVerified || user.phoneNumber);

  /* ----------------------------------------------------------------
     🖼️ UI
  ---------------------------------------------------------------- */
  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded shadow space-y-5">
      <h1 className="text-2xl font-bold text-center">Verify Your Account</h1>

      {/* ✅ Email Verification */}
      {!emailVerified ? (
        <div className="p-4 border rounded bg-yellow-50 space-y-2">
          <p>
            Your email <b>{user.email}</b> is not verified.
          </p>
          <button
            onClick={handleSendVerification}
            disabled={emailSent}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {emailSent ? "Verification Sent ✔" : "Send Verification Email"}
          </button>
        </div>
      ) : (
        <div className="p-4 border rounded bg-green-50">✅ Email verified.</div>
      )}

      {/* ✅ Phone Verification */}
      {!phoneVerified ? (
        <div className="p-4 border rounded bg-yellow-50 space-y-3">
          <p>Verify your phone number via OTP:</p>
          <input
            className="w-full border rounded p-2"
            placeholder="+919876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={startPhoneLink}
              disabled={loading}
              className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-black/90"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
            <input
              className="flex-1 border rounded p-2"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button
              onClick={verifyOtp}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
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
        <p
          className={`text-sm ${
            msg.includes("✅") || msg.includes("🎉")
              ? "text-green-700"
              : "text-gray-700"
          }`}
        >
          {msg}
        </p>
      )}
    </div>
  );
}
