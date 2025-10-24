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

  /* ------------------------------------------------------
     🔐 AUTH STATE LISTENER + FETCH PROFILE
  ------------------------------------------------------ */
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

  /* ------------------------------------------------------
     ✅ Initialize reCAPTCHA (fixed argument order)
  ------------------------------------------------------ */
  async function ensureRecaptcha() {
    if (recaptchaRef.current) return recaptchaRef.current;
    if (!recaptchaDivRef.current) return null;

    recaptchaRef.current = new RecaptchaVerifier(
      auth, // ✅ first: Auth instance
      recaptchaDivRef.current, // ✅ second: container element
      { size: "invisible" }
    );

    await recaptchaRef.current.render();
    return recaptchaRef.current;
  }

  /* ------------------------------------------------------
     ✉️ SEND EMAIL VERIFICATION
  ------------------------------------------------------ */
  const handleSendVerification = async () => {
    if (!auth.currentUser) return;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    await sendEmailVerification(auth.currentUser, { url: `${appUrl}/auth/verify` });

    setEmailSent(true);
    setMsg("📩 Verification email sent successfully!");
  };

  /* ------------------------------------------------------
     📱 SEND PHONE OTP
  ------------------------------------------------------ */
  const startPhoneLink = async () => {
    setMsg(null);
    if (!auth.currentUser) return;

    if (!/^\+?\d{10,15}$/.test(phone)) {
      setMsg("Enter valid phone number with country code (e.g. +919876543210)");
      return;
    }

    setLoading(true);
    try {
      const verifier = await ensureRecaptcha();
      if (!verifier) throw new Error("Failed to initialize reCAPTCHA.");

      confirmationRef.current = await linkWithPhoneNumber(auth.currentUser, phone, verifier);
      setMsg("📲 OTP sent to your phone.");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------
     ✅ VERIFY OTP
  ------------------------------------------------------ */
  const verifyOtp = async () => {
    setMsg(null);

    if (!otp) return setMsg("Enter the OTP first.");
    if (!confirmationRef.current) return setMsg("OTP session expired. Please resend.");

    setLoading(true);
    try {
      const res = await confirmationRef.current.confirm(otp);
      await updateDoc(doc(db, "users", res.user.uid), {
        phoneVerified: true,
        phone,
      });
      setMsg("✅ Phone number verified successfully!");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Invalid OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------
     🚫 Not logged in state
  ------------------------------------------------------ */
  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded shadow">
        <h1 className="text-xl font-bold">Not logged in</h1>
        <p className="text-gray-600">Please register or login first.</p>
      </div>
    );
  }

  /* ------------------------------------------------------
     ✅ STATUS UI
  ------------------------------------------------------ */
  const emailVerified = user.emailVerified;
  const phoneVerified = Boolean(profile?.phoneVerified || user.phoneNumber);

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded shadow space-y-5">
      <h1 className="text-2xl font-bold text-center text-gray-800">
        Verify Your Account
      </h1>

      {/* EMAIL VERIFICATION */}
      {!emailVerified ? (
        <div className="p-4 border rounded bg-yellow-50 space-y-2">
          <p>
            Your email <b>{user.email}</b> is not verified yet.
          </p>
          <button
            onClick={handleSendVerification}
            disabled={emailSent}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            {emailSent ? "Verification Sent ✔" : "Send Verification Email"}
          </button>
        </div>
      ) : (
        <div className="p-4 border rounded bg-green-50">
          ✅ Your email is verified.
        </div>
      )}

      {/* PHONE VERIFICATION */}
      {!phoneVerified ? (
        <div className="p-4 border rounded bg-yellow-50 space-y-3">
          <p className="font-medium text-gray-800">
            Verify your phone number via OTP:
          </p>

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
              onClick={verifyOtp}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </div>

          {/* reCAPTCHA container */}
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
