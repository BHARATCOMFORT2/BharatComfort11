"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
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
import { sendOtp, verifyOtp, initRecaptcha, resendOtp, clearOtpSession } from "@/lib/otp";

/* 🌍 Country codes */
const countryCodes = [
  { code: "+91", name: "India 🇮🇳" },
  { code: "+1", name: "USA 🇺🇸" },
  { code: "+44", name: "UK 🇬🇧" },
  { code: "+61", name: "Australia 🇦🇺" },
  { code: "+971", name: "UAE 🇦🇪" },
  { code: "+49", name: "Germany 🇩🇪" },
  { code: "+81", name: "Japan 🇯🇵" },
];

/* ✨ Admins that skip verification */
const ADMIN_EMAILS = ["shrrajbhar12340@gmail.com", "founder@bharatcomfort.in"];

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<"register" | "otp">("register");
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [tempUid, setTempUid] = useState<string | null>(null);

  /* 🔐 reCAPTCHA once */
  useEffect(() => {
    initRecaptcha("recaptcha-container");
  }, []);

  /* ⏱️ Countdown */
  useEffect(() => {
    if (step !== "otp" || !otpSentAt) return;
    const interval = setInterval(() => {
      const diff = 600 - Math.floor((Date.now() - otpSentAt) / 1000);
      setTimeLeft(diff > 0 ? diff : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [otpSentAt, step]);

  const formattedTime = `${Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, "0")}:${(timeLeft % 60).toString().padStart(2, "0")}`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  /* 🧩 STEP 1: Create Auth user + send email + OTP */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Enter your name.");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");

    const phoneNumber = `${countryCode}${form.phone.trim().replace(/\s+/g, "")}`;
    if (!/^\+[1-9]\d{9,14}$/.test(phoneNumber)) return setError("Enter a valid phone number.");

    // 🔒 Admin skip verification
    if (ADMIN_EMAILS.includes(form.email.trim().toLowerCase())) {
      router.push("/(dashboard)/admin");
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const user = cred.user;
      setTempUid(user.uid);

      // Send verification mail
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      await sendEmailVerification(user, { url: `${appUrl}/auth/verify-email` });

      // Send OTP
      await sendOtp(phoneNumber);
      setOtpSentAt(Date.now());
      setTimeLeft(600);
      setStep("otp");

      alert("📩 Email verification link and OTP sent!");
    } catch (err: any) {
      console.error("Register error:", err);
      if (err.code === "auth/email-already-in-use")
        setError("Email already in use. Try logging in instead.");
      else setError("Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  /* 🧩 STEP 2: Verify OTP, then write Firestore */
  const handleVerifyOtp = async () => {
    if (!otp.trim()) return setError("Enter OTP first.");
    if (!tempUid) return setError("Session expired. Please re-register.");

    setLoading(true);
    try {
      const resultUser = await verifyOtp(otp);
      if (!resultUser?.uid) throw new Error("Invalid OTP.");

      await resultUser.reload();

      // Wait until email verified
      if (!resultUser.emailVerified) {
        alert("📧 Please verify your email first, then continue.");
        setLoading(false);
        return;
      }

      // ✅ Safe to store verified user in Firestore
      let referredBy: string | null = null;
      if (form.referral.trim()) {
        const refQuery = query(collection(db, "users"), where("referralCode", "==", form.referral.trim()));
        const snapshot = await getDocs(refQuery);
        if (!snapshot.empty) referredBy = snapshot.docs[0].id;
      }

      const referralCode =
        form.name.split(" ")[0].toUpperCase() + "-" + nanoid(5).toUpperCase();

      await setDoc(doc(db, "users", resultUser.uid), {
        uid: resultUser.uid,
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

      clearOtpSession();
      alert("🎉 Account created successfully! You can now log in.");
      router.push("/auth/login");
    } catch (err: any) {
      console.error("OTP verify error:", err);
      setError(err.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    const phoneNumber = `${countryCode}${form.phone.trim().replace(/\s+/g, "")}`;
    try {
      await resendOtp(phoneNumber);
      setOtpSentAt(Date.now());
      setTimeLeft(600);
      alert("📲 New OTP sent!");
    } catch (err: any) {
      console.error("Resend OTP error:", err);
      setError("Failed to resend OTP. Try again.");
    }
  };

  /* 🖼️ UI */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 space-y-6">
        {step === "register" && (
          <>
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Create Account</h1>
            <p className="text-center text-gray-500 mb-4">Step 1 of 2 – Register your account</p>

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

            {/* reCAPTCHA container (invisible) */}
            <div id="recaptcha-container" className="hidden" />
          </>
        )}

        {step === "otp" && (
          <>
            <h1 className="text-2xl font-semibold text-center text-gray-800">Verify Phone Number</h1>
            <p className="text-center text-gray-500 mb-2">Step 2 of 2 – OTP sent to {countryCode} {form.phone}</p>
            {error && <p className="text-red-600 bg-red-50 p-2 rounded text-sm">{error}</p>}

            <div className="flex gap-2 mt-4">
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" className="flex-1 border rounded-lg p-3" />
              <Button onClick={handleVerifyOtp} disabled={loading}>{loading ? "Verifying..." : "Verify"}</Button>
            </div>

            <p className="text-sm text-gray-600 text-center mt-3">
              OTP expires in <b>{formattedTime}</b>
            </p>

            {timeLeft === 0 && (
              <div className="text-center mt-3">
                <Button onClick={handleResendOtp}>Resend OTP</Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
