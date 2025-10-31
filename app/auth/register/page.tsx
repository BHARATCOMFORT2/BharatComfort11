"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";

/* =====================================================
   🌍 Country Codes
===================================================== */
const countryCodes = [
  { code: "+91", name: "India 🇮🇳" },
  { code: "+1", name: "USA 🇺🇸" },
  { code: "+44", name: "UK 🇬🇧" },
  { code: "+61", name: "Australia 🇦🇺" },
  { code: "+971", name: "UAE 🇦🇪" },
  { code: "+49", name: "Germany 🇩🇪" },
  { code: "+81", name: "Japan 🇯🇵" },
];

/* =====================================================
   ✨ Register Page
===================================================== */
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
  });
  const [countryCode, setCountryCode] = useState("+91");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const recaptchaRef = useRef<HTMLDivElement | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<import("firebase/auth").ConfirmationResult | null>(null);

  /* ---------------------------------------------------
     🔐 Init reCAPTCHA (Invisible)
  --------------------------------------------------- */
  const initializeRecaptcha = () => {
    if (typeof window === "undefined") return;
    if (!recaptchaRef.current) return;

    try {
      recaptchaVerifierRef.current = new RecaptchaVerifier(
        auth,
        recaptchaRef.current,
        { size: "invisible" }
      );
      recaptchaVerifierRef.current.render();
      console.log("✅ reCAPTCHA initialized");
    } catch (err) {
      console.warn("⚠️ reCAPTCHA already exists or failed:", err);
    }
  };

  useEffect(() => {
    initializeRecaptcha();
  }, []);

  /* ---------------------------------------------------
     ⏱️ Countdown Timer (10 minutes)
  --------------------------------------------------- */
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

  /* ---------------------------------------------------
     ✍️ Handle Input Change
  --------------------------------------------------- */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  /* ---------------------------------------------------
     🧩 STEP 1: Register User and Send OTP
  --------------------------------------------------- */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Enter your name.");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");

    const phoneNumber = `${countryCode}${form.phone.trim().replace(/\s+/g, "")}`;
    if (!/^\+[1-9]\d{9,14}$/.test(phoneNumber)) return setError("Enter a valid phone number.");

    setLoading(true);
    try {
      // 🔹 1. Create user in Auth
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const user = cred.user;

      // 🔹 2. Save to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: form.name,
        email: form.email,
        phone: phoneNumber,
        role: form.role,
        status: form.role === "partner" ? "pending" : "active",
        emailVerified: false,
        phoneVerified: false,
        createdAt: serverTimestamp(),
      });

      // 🔹 3. Send email verification link
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      await sendEmailVerification(user, { url: `${appUrl}/auth/verify-email` });

      // 🔹 4. Send OTP to phone
      await recaptchaVerifierRef.current?.render();
      confirmationResultRef.current = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        recaptchaVerifierRef.current!
      );

      setOtpSentAt(Date.now());
      setTimeLeft(600);
      setStep("otp");
      alert("📩 Verification email sent and OTP sent to your phone!");
    } catch (err: any) {
      console.error("Register error:", err);
      if (err.code === "auth/email-already-in-use") setError("Email already in use.");
      else if (err.code === "auth/invalid-phone-number") setError("Invalid phone number format.");
      else setError("Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------
     🧩 STEP 2: Verify OTP
  --------------------------------------------------- */
  const handleVerifyOtp = async () => {
    if (!otp.trim()) return setError("Enter OTP first.");
    if (!confirmationResultRef.current) return setError("OTP session expired. Please resend.");
    if (otpSentAt && Date.now() - otpSentAt > 10 * 60 * 1000)
      return setError("⏳ OTP expired. Please resend.");

    setLoading(true);
    try {
      const result = await confirmationResultRef.current.confirm(otp.trim());
      await updateDoc(doc(db, "users", result.user.uid), { phoneVerified: true });
      alert("✅ Phone verified successfully! Continue to verify your email.");
      router.push("/auth/verify-email");
    } catch (err: any) {
      console.error("OTP verify error:", err);
      setError("Invalid OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------
     🔁 RESEND OTP (after expiry)
  --------------------------------------------------- */
  const handleResendOtp = async () => {
    setError("");
    const phoneNumber = `${countryCode}${form.phone.trim().replace(/\s+/g, "")}`;
    if (!recaptchaVerifierRef.current) initializeRecaptcha();

    try {
      confirmationResultRef.current = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        recaptchaVerifierRef.current!
      );
      setOtpSentAt(Date.now());
      setTimeLeft(600);
      alert("📲 New OTP sent!");
    } catch (err: any) {
      console.error("Resend OTP error:", err);
      setError("Failed to resend OTP. Try again.");
    }
  };

  /* ---------------------------------------------------
     🖼️ UI
  --------------------------------------------------- */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 space-y-6">
        {step === "register" && (
          <>
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
              Create Account
            </h1>
            <p className="text-center text-gray-500 mb-4">
              Step 1 of 2 – Register your account
            </p>

            {error && <p className="text-red-600 bg-red-50 p-2 rounded text-sm">{error}</p>}

            <form onSubmit={handleRegister} className="space-y-4">
              <input
                name="name"
                type="text"
                placeholder="Full Name"
                value={form.name}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              />

              <input
                name="email"
                type="email"
                placeholder="Email Address"
                value={form.email}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              />

              <div className="flex gap-2">
                <select
                  className="border rounded-lg p-2 bg-white w-28"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                >
                  {countryCodes.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                <input
                  name="phone"
                  type="tel"
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={handleChange}
                  className="flex-1 border rounded-lg p-3"
                  required
                />
              </div>

              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-3 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-3 text-gray-500"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="relative">
                <input
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-3 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-3 top-3 text-gray-500"
                >
                  {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
              >
                <option value="user">User</option>
                <option value="partner">Partner</option>
              </select>

              <Button type="submit" disabled={loading}>
                {loading ? "Registering..." : "Register"}
              </Button>
            </form>

            <div ref={recaptchaRef} />
          </>
        )}

        {step === "otp" && (
          <>
            <h1 className="text-2xl font-semibold text-center text-gray-800">
              Verify Phone Number
            </h1>
            <p className="text-center text-gray-500 mb-2">
              Step 2 of 2 – OTP sent to {countryCode} {form.phone}
            </p>
            {error && <p className="text-red-600 bg-red-50 p-2 rounded text-sm">{error}</p>}

            <div className="flex gap-2 mt-4">
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP"
                className="flex-1 border rounded-lg p-3"
              />
              <Button onClick={handleVerifyOtp} disabled={loading}>
                {loading ? "Verifying..." : "Verify"}
              </Button>
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
