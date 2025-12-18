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

type Step = "register" | "phone" | "email";

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("register");
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
  const [uid, setUid] = useState<string | null>(null);

  /* 🔐 reCAPTCHA INIT */
  useEffect(() => {
    initRecaptcha("recaptcha-container");
  }, []);

  /* ⏱️ OTP TIMER */
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

  /* =================================================
     STEP 1️⃣ REGISTER (NO FIREBASE AUTH HERE)
  ================================================= */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Enter your name.");
    if (form.password !== form.confirmPassword)
      return setError("Passwords do not match.");

    const raw = form.phone.replace(/\D/g, "");
    const clean = raw.startsWith("0") ? raw.slice(1) : raw;
    const phoneNumber = `${countryCode}${clean}`;

    if (!/^\+[1-9]\d{9,14}$/.test(phoneNumber))
      return setError("Invalid phone number.");

    setLoading(true);
    try {
      // 🔐 STORE TEMP DATA (NO AUTH YET)
      sessionStorage.setItem(
        "pendingSignup",
        JSON.stringify({
          ...form,
          phone: phoneNumber,
        })
      );

      await sendOtp(phoneNumber);
      setOtpSentAt(Date.now());
      setTimeLeft(600);
      setStep("phone");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  /* =================================================
     STEP 2️⃣ PHONE OTP VERIFY → CREATE AUTH USER
  ================================================= */
  const handleVerifyPhoneOtp = async () => {
    if (!otp.trim()) return setError("Enter OTP.");

    setLoading(true);
    try {
      await verifyOtp(otp);

      const pending = JSON.parse(
        sessionStorage.getItem("pendingSignup") || "{}"
      );

      if (!pending.email || !pending.password) {
        throw new Error("Session expired. Please register again.");
      }

      // 🔥 CREATE AUTH USER ONLY AFTER OTP VERIFIED
      const cred = await createUserWithEmailAndPassword(
        auth,
        pending.email,
        pending.password
      );

      setUid(cred.user.uid);
      clearOtpSession();
      setStep("email");

      await fetch("/api/auth/send-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pending.email }),
      });
    } catch (err: any) {
      setError(err.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      await resendOtp();
      setOtpSentAt(Date.now());
      setTimeLeft(600);
    } catch (err: any) {
      setError(err.message || "Resend failed.");
    }
  };

  /* =================================================
     STEP 3️⃣ EMAIL OTP → USER + PARTNER CREATE
  ================================================= */
  const handleVerifyEmailOtp = async () => {
    if (!emailOtp.trim()) return setError("Enter Email OTP.");
    if (!uid) return setError("Session expired.");

    setLoading(true);
    try {
      const pending = JSON.parse(
        sessionStorage.getItem("pendingSignup") || "{}"
      );

      const verifyRes = await fetch("/api/auth/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pending.email, otp: emailOtp }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.success) throw new Error(verifyData.message);

      let referredBy: string | null = null;
      if (pending.referral) {
        const q = query(
          collection(db, "users"),
          where("referralCode", "==", pending.referral)
        );
        const snap = await getDocs(q);
        if (!snap.empty) referredBy = snap.docs[0].id;
      }

      const referralCode =
        pending.name.split(" ")[0].toUpperCase() +
        "-" +
        nanoid(5).toUpperCase();

      // ✅ CREATE VERIFIED USER
      const createUserRes = await fetch("/api/auth/create-verified-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          name: pending.name,
          email: pending.email,
          phone: pending.phone,
          role: pending.role,
          referredBy,
          referralCode,
        }),
      });

      const userData = await createUserRes.json();
      if (!userData.success) throw new Error(userData.message);

      // 🔥 CREATE PARTNER
      if (pending.role === "partner") {
        const token = await auth.currentUser?.getIdToken();

        const partnerRes = await fetch("/api/partners/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            displayName: pending.name,
            email: pending.email,
            phone: pending.phone,
            businessName: "",
            metadata: {},
          }),
        });

        const partnerData = await partnerRes.json();
        if (!partnerData.success)
          throw new Error("Partner creation failed.");
      }

      sessionStorage.removeItem("pendingSignup");
      router.push(
        pending.role === "partner" ? "/partner/dashboard" : "/dashboard"
      );
    } catch (err: any) {
      setError(err.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  /* =================================================
     UI
  ================================================= */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 space-y-6">
        {error && (
          <p className="text-red-600 bg-red-50 p-2 rounded text-sm">{error}</p>
        )}

        {step === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <h1 className="text-2xl font-bold text-center">Create Account</h1>

            <input
              name="name"
              placeholder="Full Name"
              required
              value={form.name}
              onChange={handleChange}
              className="w-full border rounded p-3"
            />

            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full border rounded p-3"
            />

            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="border rounded p-2"
              >
                {countryCodes.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                name="phone"
                placeholder="Phone"
                required
                value={form.phone}
                onChange={handleChange}
                className="flex-1 border rounded p-3"
              />
            </div>

            <input
              name="referral"
              placeholder="Referral Code"
              value={form.referral}
              onChange={handleChange}
              className="w-full border rounded p-3"
            />

            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                className="w-full border rounded p-3"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>

            <div className="relative">
              <input
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm Password"
                value={form.confirmPassword}
                onChange={handleChange}
                className="w-full border rounded p-3"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-3"
              >
                {showConfirm ? <EyeOff /> : <Eye />}
              </button>
            </div>

            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full border rounded p-3"
            >
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
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter OTP"
              className="w-full border rounded p-3"
            />
            <Button onClick={handleVerifyPhoneOtp} disabled={loading}>
              Verify
            </Button>
            <Button onClick={handleResendOtp} disabled={timeLeft > 0}>
              {timeLeft > 0 ? `Resend in ${formattedTime}` : "Resend OTP"}
            </Button>
          </>
        )}

        {step === "email" && (
          <>
            <h2 className="text-center font-semibold">Verify Email</h2>
            <input
              value={emailOtp}
              onChange={(e) => setEmailOtp(e.target.value)}
              placeholder="Enter Email OTP"
              className="w-full border rounded p-3"
            />
            <Button onClick={handleVerifyEmailOtp} disabled={loading}>
              Verify
            </Button>
          </>
        )}
      </div>

      {/* ❗ DO NOT HIDE THIS */}
      <div id="recaptcha-container"></div>
    </div>
  );
}
