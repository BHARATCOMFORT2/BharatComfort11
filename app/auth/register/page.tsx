"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { getDocs, query, where, collection } from "firebase/firestore";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { nanoid } from "nanoid";
import {
  sendOtp,
  verifyOtp,
  initRecaptcha,
  resendOtp,
  clearOtpSession,
} from "@/lib/otp";

/* 🌍 Country Codes */
const countryCodes = [
  { code: "+91", name: "India 🇮🇳" },
  { code: "+1", name: "USA 🇺🇸" },
  { code: "+44", name: "UK 🇬🇧" },
  { code: "+61", name: "Australia 🇦🇺" },
  { code: "+971", name: "UAE 🇦🇪" },
  { code: "+49", name: "Germany 🇩🇪" },
  { code: "+81", name: "Japan 🇯🇵" },
];

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<"register" | "phone" | "email">("register");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "user",
    referral: "",
  });

  const [countryCode, setCountryCode] = useState("+91");
  const [otp, setOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [tempUid, setTempUid] = useState<string | null>(null);

  /* 🔐 reCAPTCHA */
  useEffect(() => {
    const id = setTimeout(() => initRecaptcha("recaptcha-container"), 0);
    return () => clearTimeout(id);
  }, []);

  /* ⏱️ OTP Timer */
  useEffect(() => {
    if (step !== "phone" || !otpSentAt) return;
    const t = setInterval(() => {
      const diff = 600 - Math.floor((Date.now() - otpSentAt) / 1000);
      setTimeLeft(diff > 0 ? diff : 0);
    }, 1000);
    return () => clearInterval(t);
  }, [otpSentAt, step]);

  const formattedTime = `${Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, "0")}:${(timeLeft % 60).toString().padStart(2, "0")}`;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  /* =========================
     STEP 1 – REGISTER
  ========================= */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Enter your name.");
    if (form.password !== form.confirmPassword)
      return setError("Passwords do not match.");

    const phoneNumber = `${countryCode}${form.phone.trim()}`;
    if (!/^\+[1-9]\d{9,14}$/.test(phoneNumber))
      return setError("Invalid phone number.");

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      setTempUid(cred.user.uid);

      await sendOtp(phoneNumber);
      setOtpSentAt(Date.now());
      setTimeLeft(600);
      setStep("phone");
    } catch (err: any) {
      setError(
        err.code === "auth/email-already-in-use"
          ? "Email already in use."
          : "Registration failed."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     STEP 2 – PHONE OTP
  ========================= */
  const handleVerifyPhoneOtp = async () => {
    if (!otp.trim()) return setError("Enter OTP.");
    if (!tempUid) return setError("Session expired.");

    setLoading(true);
    try {
      const user = await verifyOtp(otp);
      if (!user) throw new Error("Invalid OTP.");

      clearOtpSession();
      setStep("email");

      await fetch("/api/auth/send-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
    } catch (err: any) {
      setError(err.message || "OTP failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      await resendOtp(`${countryCode}${form.phone}`);
      setOtpSentAt(Date.now());
      setTimeLeft(600);
    } catch {
      setError("Resend failed.");
    }
  };

  /* =========================
     STEP 3 – EMAIL OTP + USER + PARTNER CREATE
  ========================= */
  const handleVerifyEmailOtp = async () => {
    if (!emailOtp.trim()) return setError("Enter Email OTP.");
    if (!tempUid) return setError("Session expired.");

    setLoading(true);
    try {
      /* Verify email OTP */
      const verifyRes = await fetch("/api/auth/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp: emailOtp }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) throw new Error(verifyData.message);

      /* Referral lookup */
      let referredBy: string | null = null;
      if (form.referral.trim()) {
        const q = query(
          collection(db, "users"),
          where("referralCode", "==", form.referral.trim())
        );
        const snap = await getDocs(q);
        if (!snap.empty) referredBy = snap.docs[0].id;
      }

      const referralCode =
        form.name.split(" ")[0].toUpperCase() + "-" + nanoid(5).toUpperCase();

      /* Create verified user */
      const createUserRes = await fetch("/api/auth/create-verified-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: tempUid,
          name: form.name,
          email: form.email,
          phone: `${countryCode}${form.phone}`,
          role: form.role,
          referredBy,
          referralCode,
          kycStatus: form.role === "partner" ? "NOT_STARTED" : null,
        }),
      });

      const userData = await createUserRes.json();
      if (!userData.success) throw new Error(userData.message);

      /* 🔥 CREATE PARTNER (FIX) */
      if (form.role === "partner") {
        const token = await auth.currentUser?.getIdToken();

        const partnerRes = await fetch("/api/partners/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            displayName: form.name,
            email: form.email,
            phone: `${countryCode}${form.phone}`,
            businessName: "",
            metadata: {},
          }),
        });

        const partnerData = await partnerRes.json();
        if (!partnerData.success)
          throw new Error("Partner creation failed.");
      }

      router.push(
        form.role === "partner" ? "/partner/dashboard" : "/dashboard"
      );
    } catch (err: any) {
      setError(err.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     UI
  ========================= */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 space-y-6">

        {error && (
          <p className="text-red-600 bg-red-50 p-2 rounded text-sm">{error}</p>
        )}

        {step === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <h1 className="text-2xl font-bold text-center">Create Account</h1>

            <input name="name" placeholder="Full Name" required
              value={form.name} onChange={handleChange}
              className="w-full border rounded p-3" />

            <input name="email" type="email" placeholder="Email" required
              value={form.email} onChange={handleChange}
              className="w-full border rounded p-3" />

            <div className="flex gap-2">
              <select value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="border rounded p-2">
                {countryCodes.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              <input name="phone" placeholder="Phone" required
                value={form.phone} onChange={handleChange}
                className="flex-1 border rounded p-3" />
            </div>

            <input name="referral" placeholder="Referral Code"
              value={form.referral} onChange={handleChange}
              className="w-full border rounded p-3" />

            <input name="password" type="password" placeholder="Password"
              value={form.password} onChange={handleChange}
              className="w-full border rounded p-3" />

            <input name="confirmPassword" type="password"
              placeholder="Confirm Password"
              value={form.confirmPassword} onChange={handleChange}
              className="w-full border rounded p-3" />

            <select name="role" value={form.role}
              onChange={handleChange}
              className="w-full border rounded p-3">
              <option value="user">User</option>
              <option value="partner">Partner</option>
            </select>

            <Button type="submit" disabled={loading}>
              {loading ? "Please wait..." : "Register"}
            </Button>
          </form>
        )}

        {step === "phone" && (
          <>
            <h2 className="text-center font-semibold">Verify Phone</h2>
            <input value={otp} onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter OTP"
              className="w-full border rounded p-3" />
            <Button onClick={handleVerifyPhoneOtp}>Verify</Button>
            <Button onClick={handleResendOtp} disabled={timeLeft > 0}>
              {timeLeft > 0 ? `Resend in ${formattedTime}` : "Resend OTP"}
            </Button>
          </>
        )}

        {step === "email" && (
          <>
            <h2 className="text-center font-semibold">Verify Email</h2>
            <input value={emailOtp} onChange={(e) => setEmailOtp(e.target.value)}
              placeholder="Enter Email OTP"
              className="w-full border rounded p-3" />
            <Button onClick={handleVerifyEmailOtp}>Verify</Button>
          </>
        )}
      </div>

      <div id="recaptcha-container" className="hidden" />
    </div>
  );
}
