"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDocs,
  query,
  where,
  collection,
  serverTimestamp,
} from "firebase/firestore";
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
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [tempUid, setTempUid] = useState<string | null>(null);

  /* 🔐 Initialize reCAPTCHA */
  useEffect(() => {
    const id = setTimeout(() => initRecaptcha("recaptcha-container"), 0);
    return () => clearTimeout(id);
  }, []);

  /* ⏱️ Countdown Timer for phone OTP */
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  /* 🧩 STEP 1: Register user (no Firestore yet) + Send Phone OTP */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Enter your name.");
    if (form.password !== form.confirmPassword)
      return setError("Passwords do not match.");

    const phoneNumber = `${countryCode}${form.phone.trim().replace(/\s+/g, "")}`;
    if (!/^\+[1-9]\d{9,14}$/.test(phoneNumber))
      return setError("Enter a valid phone number.");

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const user = cred.user;
      setTempUid(user.uid);

      await sendOtp(phoneNumber);
      setOtpSentAt(Date.now());
      setTimeLeft(600);
      setStep("phone");

      alert("📲 OTP sent to your phone!");
    } catch (err: any) {
      console.error("Register error:", err);
      setError(
        err.code === "auth/email-already-in-use"
          ? "Email already in use."
          : "Registration failed. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* 🧩 STEP 2: Verify Phone OTP */
  const handleVerifyPhoneOtp = async () => {
    if (!otp.trim()) return setError("Enter OTP first.");
    if (!tempUid) return setError("Session expired. Please re-register.");

    setLoading(true);
    try {
      const resultUser = await verifyOtp(otp);
      if (!resultUser?.uid) throw new Error("Invalid OTP.");

      clearOtpSession();
      setStep("email");

      // Send Email OTP via API
      const res = await fetch("/api/auth/send-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setEmailOtpSent(true);
      alert("📧 OTP sent to your email!");
    } catch (err: any) {
      console.error("Phone OTP verify error:", err);
      setError(err.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    const phoneNumber = `${countryCode}${form.phone.trim().replace(/\s+/g, "")}`;
    try {
      await resendOtp(phoneNumber);
      setOtpSentAt(Date.now());
      setTimeLeft(600);
      alert("📲 New OTP sent!");
    } catch {
      setError("Failed to resend OTP.");
    }
  };

  /* 🧩 STEP 3: Verify Email OTP */
  const handleVerifyEmailOtp = async () => {
    if (!emailOtp.trim()) return setError("Enter Email OTP first.");
    if (!tempUid) return setError("Session expired. Please re-register.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp: emailOtp }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      let referredBy: string | null = null;
      if (form.referral.trim()) {
        const refQuery = query(collection(db, "users"), where("referralCode", "==", form.referral.trim()));
        const snapshot = await getDocs(refQuery);
        if (!snapshot.empty) referredBy = snapshot.docs[0].id;
      }

      const referralCode =
        form.name.split(" ")[0].toUpperCase() + "-" + nanoid(5).toUpperCase();

      await setDoc(doc(db, "users", tempUid!), {
        uid: tempUid,
        name: form.name,
        email: form.email,
        phone: `${countryCode}${form.phone}`,
        role: form.role,
        status: form.role === "partner" ? "pending" : "active",
        emailVerified: true,
        phoneVerified: true,
        verified: true,
        referralCode,
        referredBy,
        createdAt: serverTimestamp(),
      });

      alert("🎉 Account created successfully! You can now log in.");
      router.push("/auth/login");
    } catch (err: any) {
      console.error("Email OTP verify error:", err);
      setError(err.message || "Email OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  /* 🖼️ UI */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 space-y-6">

        {/* Step 1: Register */}
        {step === "register" && (
          <>
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Create Account</h1>
            <p className="text-center text-gray-500 mb-4">Step 1 of 3 – Register your account</p>

            {error && <p className="text-red-600 bg-red-50 p-2 rounded text-sm">{error}</p>}

            <form onSubmit={handleRegister} className="space-y-4">
              <input name="name" placeholder="Full Name" value={form.name} onChange={handleChange} className="w-full border rounded-lg p-3" required />
              <input name="email" type="email" placeholder="Email Address" value={form.email} onChange={handleChange} className="w-full border rounded-lg p-3" required />

              <div className="flex gap-2">
                <select className="border rounded-lg p-2 bg-white w-28" value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
                  {countryCodes.map((c) => (
                    <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                  ))}
                </select>
                <input name="phone" type="tel" placeholder="9876543210" value={form.phone} onChange={handleChange} className="flex-1 border rounded-lg p-3" required />
              </div>

              <input name="referral" placeholder="Referral Code (optional)" value={form.referral} onChange={handleChange} className="w-full border rounded-lg p-3" />

              <div className="relative">
                <input name="password" type={showPassword ? "text" : "password"} placeholder="Password" value={form.password} onChange={handleChange} className="w-full border rounded-lg p-3 pr-10" required />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-3 text-gray-500">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
              </div>

              <div className="relative">
                <input name="confirmPassword" type={showConfirm ? "text" : "password"} placeholder="Confirm Password" value={form.confirmPassword} onChange={handleChange} className="w-full border rounded-lg p-3 pr-10" required />
                <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-3 top-3 text-gray-500">{showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}</button>
              </div>

              <select name="role" value={form.role} onChange={handleChange} className="w-full border rounded-lg p-3">
                <option value="user">User</option>
                <option value="partner">Partner</option>
              </select>

              <Button type="submit" disabled={loading}>{loading ? "Registering..." : "Register"}</Button>
            </form>

            <div id="recaptcha-container" className="hidden" />
          </>
        )}

        {/* Step 2: Phone OTP */}
        {step === "phone" && (
          <>
            <h1 className="text-2xl font-semibold text-center text-gray-800">Verify Phone Number</h1>
            <p className="text-center text-gray-500 mb-2">Step 2 of 3 – OTP sent to {countryCode} {form.phone}</p>
            {error && <p className="text-red-600 bg-red-50 p-2 rounded text-sm">{error}</p>}

            <div className="flex gap-2 mt-4">
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" className="flex-1 border rounded-lg p-3" />
              <Button onClick={handleVerifyPhoneOtp} disabled={loading}>{loading ? "Verifying..." : "Verify"}</Button>
            </div>

            <div className="text-center mt-3">
              <Button onClick={handleResendOtp} disabled={loading || timeLeft > 0}>
                {timeLeft > 0 ? `Resend in ${formattedTime}` : "Resend OTP"}
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Email OTP */}
        {step === "email" && (
          <>
            <h1 className="text-2xl font-semibold text-center text-gray-800">Verify Email</h1>
            <p className="text-center text-gray-500 mb-2">Step 3 of 3 – OTP sent to {form.email}</p>
            {error && <p className="text-red-600 bg-red-50 p-2 rounded text-sm">{error}</p>}

            <div className="flex gap-2 mt-4">
              <input type="text" value={emailOtp} onChange={(e) => setEmailOtp(e.target.value)} placeholder="Enter Email OTP" className="flex-1 border rounded-lg p-3" />
              <Button onClick={handleVerifyEmailOtp} disabled={loading}>{loading ? "Verifying..." : "Verify"}</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
