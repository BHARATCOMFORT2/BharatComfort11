"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, updateDoc, getDoc } from "firebase/firestore";
import Input from "@/components/forms/Input";
import Button from "@/components/forms/Button";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<"form" | "otp" | "done">("form");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "user",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otp, setOtp] = useState("");

  // ⏱️ Countdown states
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [emailCountdown, setEmailCountdown] = useState(0);

  const confirmationResultRef = useRef<import("firebase/auth").ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);

  /* ---------------------------------------------------------
     ✅ Initialize Invisible reCAPTCHA
  --------------------------------------------------------- */
  useEffect(() => {
    if (typeof window !== "undefined" && !recaptchaVerifierRef.current && recaptchaContainerRef.current) {
      try {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
          size: "invisible",
        });
        recaptchaVerifierRef.current.render();
        console.log("✅ reCAPTCHA initialized");
      } catch {
        console.warn("⚠️ reCAPTCHA already initialized or unavailable");
      }
    }
  }, []);

  /* ---------------------------------------------------------
     ⏳ Countdown hooks
  --------------------------------------------------------- */
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => setOtpCountdown((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  useEffect(() => {
    if (emailCountdown <= 0) return;
    const timer = setInterval(() => setEmailCountdown((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [emailCountdown]);

  /* ---------------------------------------------------------
     🧩 STEP 1: Register user + send email + OTP
  --------------------------------------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Enter your full name.");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
    if (!/^\+?\d{10,15}$/.test(form.phone)) return setError("Enter valid phone number (+91...).");

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      const user = cred.user;

      const expiryTime = Date.now() + 10 * 60 * 1000; // 10 min expiry

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        status: form.role === "partner" ? "pending" : "active",
        emailVerified: false,
        phoneVerified: false,
        otpExpiry: expiryTime,
        emailExpiry: expiryTime,
        createdAt: serverTimestamp(),
      });

      await sendEmailVerification(user);
      setEmailCountdown(60);

      // Send OTP
      confirmationResultRef.current = await signInWithPhoneNumber(
        auth,
        form.phone.trim(),
        recaptchaVerifierRef.current!
      );
      setOtpCountdown(30);

      alert("📩 Verification email and OTP sent!");
      setStep("otp");
    } catch (err: any) {
      console.error("Registration error:", err);
      let msg = "Registration failed.";
      if (err.code === "auth/email-already-in-use") msg = "Email already in use.";
      if (err.code === "auth/invalid-email") msg = "Invalid email.";
      if (err.code === "auth/weak-password") msg = "Weak password (min 6 chars).";
      if (err.code === "auth/captcha-check-failed") msg = "Captcha verification failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------
     📱 Verify OTP (check expiry)
  --------------------------------------------------------- */
  const handleVerifyOtp = async () => {
    if (!otp.trim()) return setError("Enter OTP.");
    if (!confirmationResultRef.current) return setError("OTP session expired.");

    setLoading(true);
    try {
      const result = await confirmationResultRef.current.confirm(otp.trim());
      const ref = doc(db, "users", result.user.uid);
      const snap = await getDoc(ref);
      const data = snap.data();

      if (data?.otpExpiry && Date.now() > data.otpExpiry)
        return setError("⏳ OTP expired. Please resend.");

      await updateDoc(ref, { phoneVerified: true });
      alert("✅ Phone verified successfully!");
      setStep("done");
    } catch {
      setError("Invalid or expired OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------
     🔁 Resend OTP (30s cooldown)
  --------------------------------------------------------- */
  const handleResendOtp = async () => {
    if (otpCountdown > 0) return setError("Please wait before resending OTP.");
    if (!auth.currentUser) return setError("Please login again.");
    if (!/^\+?\d{10,15}$/.test(form.phone)) return setError("Invalid phone number.");

    setLoading(true);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        otpExpiry: Date.now() + 10 * 60 * 1000,
      });

      confirmationResultRef.current = await signInWithPhoneNumber(
        auth,
        form.phone.trim(),
        recaptchaVerifierRef.current!
      );

      setOtpCountdown(30);
      alert("📲 OTP resent successfully!");
    } catch {
      setError("Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------
     ✉️ Resend Email (60s cooldown)
  --------------------------------------------------------- */
  const handleResendEmail = async () => {
    if (emailCountdown > 0) return setError("Please wait before resending email.");
    if (!auth.currentUser) return setError("User not logged in.");

    try {
      await sendEmailVerification(auth.currentUser);
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        emailExpiry: Date.now() + 10 * 60 * 1000,
      });

      setEmailCountdown(60);
      alert("📩 Verification email resent!");
    } catch {
      setError("Failed to resend verification email.");
    }
  };

  const handleGoToVerifyPage = () => router.push("/auth/verify");

  /* ---------------------------------------------------------
     🎨 UI
  --------------------------------------------------------- */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        {step === "form" && (
          <>
            <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
              Create Account
            </h1>

            {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</p>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input label="Full Name" name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input label="Email" name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <Input label="Phone" name="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />

              {/* Passwords */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full border rounded-lg p-3 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-9 text-gray-500"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="w-full border rounded-lg p-3 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-3 top-9 text-gray-500"
                >
                  {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <label className="text-gray-700 font-medium">
                Role
                <select
                  name="role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="mt-1 w-full border rounded-lg p-2"
                >
                  <option value="user">User</option>
                  <option value="partner">Partner</option>
                </select>
              </label>

              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Register"}
              </Button>
            </form>

            <p className="mt-4 text-center text-gray-500">
              Already have an account?{" "}
              <a href="/auth/login" className="text-blue-600 hover:underline">Login</a>
            </p>

            <div ref={recaptchaContainerRef} id="recaptcha-register" />
          </>
        )}

        {step === "otp" && (
          <>
            <h2 className="text-2xl font-semibold text-center mb-4">Verify Phone Number</h2>
            <p className="text-sm text-gray-600 mb-4">
              OTP sent to <b>{form.phone}</b>.  
              Email sent to <b>{form.email}</b>.
            </p>

            {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</p>}

            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="flex-1 border rounded-lg p-3"
                placeholder="Enter OTP"
              />
              <Button onClick={handleVerifyOtp} disabled={loading}>
                {loading ? "Verifying..." : "Verify"}
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between mt-4 gap-3">
              <Button
                onClick={handleResendOtp}
                disabled={otpCountdown > 0}
                className={`flex-1 ${
                  otpCountdown > 0 ? "bg-gray-400" : "bg-gray-800 hover:bg-black"
                }`}
              >
                {otpCountdown > 0 ? `Resend OTP in ${otpCountdown}s` : "Resend OTP"}
              </Button>

              <Button
                onClick={handleResendEmail}
                disabled={emailCountdown > 0}
                className={`flex-1 ${
                  emailCountdown > 0 ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {emailCountdown > 0
                  ? `Resend Email in ${emailCountdown}s`
                  : "Resend Email"}
              </Button>
            </div>
          </>
        )}

        {step === "done" && (
          <>
            <h2 className="text-2xl font-semibold text-center mb-4">All Set 🎉</h2>
            <p className="text-gray-700 text-center">
              Phone verified successfully. Please verify your email link.
            </p>
            <Button className="mt-6 w-full" onClick={handleGoToVerifyPage}>
              Go to Verification Status
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
