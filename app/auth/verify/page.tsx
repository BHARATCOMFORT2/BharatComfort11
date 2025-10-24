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

  async function ensureRecaptcha() {
    if (recaptchaRef.current) return recaptchaRef.current;
    if (!recaptchaDivRef.current) return null;
    recaptchaRef.current = new RecaptchaVerifier(auth, recaptchaDivRef.current, {
      size: "invisible",
    });
    await recaptchaRef.current.render();
    return recaptchaRef.current;
  }

  const handleSendVerification = async () => {
    if (!auth.currentUser) return;
    await sendEmailVerification(auth.currentUser, {
      url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/auth/verify`,
    });
    setEmailSent(true);
    setMsg("Verification email sent.");
  };

  const startPhoneLink = async () => {
    setMsg(null);
    if (!auth.currentUser) return;
    if (!/^\+?\d{10,15}$/.test(phone)) {
      setMsg("Enter valid phone with country code, e.g. +919876543210");
      return;
    }
    setLoading(true);
    try {
      const verifier = await ensureRecaptcha();
      if (!verifier) throw new Error("Failed to initialize reCAPTCHA.");
      confirmationRef.current = await linkWithPhoneNumber(auth.currentUser, phone, verifier);
      setMsg("OTP sent to your phone.");
    } catch (e: any) {
      setMsg(e?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setMsg(null);
    if (!otp) return setMsg("Enter the OTP.");
    if (!confirmationRef.current) return setMsg("OTP session expired. Send again.");
    setLoading(true);
    try {
      const res = await confirmationRef.current.confirm(otp);
      await updateDoc(doc(db, "users", res.user.uid), { phoneVerified: true, phone });
      setMsg("✅ Phone verified.");
    } catch (e: any) {
      setMsg(e?.message || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded shadow">
        <h1 className="text-xl font-bold">Not logged in</h1>
        <p>Please register or login first.</p>
      </div>
    );
  }

  const emailVerified = user.emailVerified;
  const phoneVerified = Boolean(profile?.phoneVerified || user.phoneNumber);

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded shadow space-y-5">
      <h1 className="text-2xl font-bold text-center">Verify Your Account</h1>

      {/* Email */}
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

      {/* Phone */}
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

      {msg && <p className="text-sm text-gray-700">{msg}</p>}
    </div>
  );
}
