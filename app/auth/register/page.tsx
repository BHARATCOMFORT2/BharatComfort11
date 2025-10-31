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
import {
  doc,
  setDoc,
  serverTimestamp,
  updateDoc,
  getDoc,
} from "firebase/firestore";
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

  const confirmationResultRef = useRef<import("firebase/auth").ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);

  /* ---------------------------------------------------------
     ✅ Initialize Invisible reCAPTCHA
  --------------------------------------------------------- */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const timer = setTimeout(() => {
      if (!recaptchaVerifierRef.current && recaptchaContainerRef.current) {
        try {
          recaptchaVerifierRef.current = new RecaptchaVerifier(
            auth,
            recaptchaContainerRef.current,
            { size: "invisible" }
          );
          recaptchaVerifierRef.current.render();
          console.log("✅ reCAPTCHA initialized");
        } catch {
          console.warn("⚠️ reCAPTCHA already initialized");
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  /* ---------------------------------------------------------
     🧩 STEP 1: Register User + Send OTP + Email Verify
  --------------------------------------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Enter your full name.");
    if (form.password !== form.confirmPassword)
      return setError("Passwords do not match.");
    if (!/^\+?\d{10,15}$/.test(form.phone))
      return setError("Enter valid phone number with country code (+91...).");

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      );
      const user = cred.user;

      // 🔹 10-minute verification expiry
      const expiryTime = Date.now() + 10 * 60 * 1000;

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

      // 🔹 Send email verification
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      await sendEmailVerification(user, { url: `${appUrl}/auth/verify` });

      // 🔹 Send OTP
      if (!recaptchaVerifierRef.current)
        throw new Error("reCAPTCHA not initialized.");

      confirmationResultRef.current = await signInWithPhoneNumber(
        auth,
        form.phone.trim(),
        recaptchaVerifierRef.current!
      );

      alert("📩 Verification email sent & OTP sent to your phone.");
      setStep("otp");
    } catch (err: any) {
      console.error("❌ Registration error:", err);
      let msg = "Registration failed. Try again.";
      if (err.code === "auth/email-already-in-use") msg = "Email already in use.";
      if (err.code === "auth/invalid-email") msg = "Invalid email address.";
      if (err.code === "auth/weak-password") msg = "Password should be at least 6 characters.";
      if (err.code === "auth/captcha-check-failed") msg = "Captcha verification failed. Please reload.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------
     📱 STEP 2: Verify OTP
  --------------------------------------------------------- */
  const handleVerifyOtp = async () => {
    if (!otp.trim()) return setError("Enter the 6-digit OTP.");
    if (!confirmationResultRef.current)
      return setError("OTP session expired. Please re-register.");

    setLoading(true);
    setError("");
    try {
      // ⏰ Check OTP expiry
      const userRef = doc(db, "users", auth.currentUser!.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.otpExpiry && Date.now() > data.otpExpiry) {
          setError("⏳ OTP expired. Please request a new one.");
          return;
        }
      }

      const result = await confirmationResultRef.current.confirm(otp.trim());
      await updateDoc(userRef, { phoneVerified: true });

      alert("✅ Phone verified successfully!");
      setStep("done");
    } catch (err: any) {
      console.error("OTP verification error:", err);
      setError("Invalid or expired OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------
     ✅ STEP 3: Redirect
  --------------------------------------------------------- */
  const handleGoToVerifyPage = () => router.push("/auth/verify");

  /* ---------------------------------------------------------
     🖼️ UI
  --------------------------------------------------------- */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        {step === "form" && (
          <>
            <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
              Create Account
            </h1>

            {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</p>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input label="Full Name" name="name" type="text" value={form.name} onChange={handleChange} required />
              <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
              <Input label="Phone (with country code)" name="phone" type="tel" value={form.phone} onChange={handleChange} required />

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-3 pr-10"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-gray-500 hover:text-gray-700">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-3 pr-10"
                  required
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-9 text-gray-500 hover:text-gray-700">
                  {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <label className="text-gray-700 font-medium">
                Select Role
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="mt-1 block w-full border rounded-lg p-2"
                >
                  <option value="user">User</option>
                  <option value="partner">Partner</option>
                </select>
              </label>

              <Button type="submit" disabled={loading}>
                {loading ? "Creating account..." : "Register"}
              </Button>
            </form>

            <p className="mt-4 text-center text-gray-500">
              Already have an account?{" "}
              <a href="/auth/login" className="text-blue-600 hover:underline">
                Login
              </a>
            </p>

            <div ref={recaptchaContainerRef} id="recaptcha-register" />
          </>
        )}

        {step === "otp" && (
          <>
            <h2 className="text-2xl font-semibold text-center mb-4">Verify Phone Number</h2>
            <p className="text-sm text-gray-600 mb-4">
              OTP sent to <b>{form.phone}</b>.  
              Check your email <b>{form.email}</b> for verification link.
            </p>
            {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</p>}
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="flex-1 border rounded-lg p-3"
                placeholder="Enter 6-digit OTP"
              />
              <Button onClick={handleVerifyOtp} disabled={loading}>
                {loading ? "Verifying..." : "Verify"}
              </Button>
            </div>
          </>
        )}

        {step === "done" && (
          <>
            <h2 className="text-2xl font-semibold text-center mb-4">All Set! 🎉</h2>
            <p className="text-gray-700 text-center">
              Your phone number is verified. Please verify your email via the link sent to <b>{form.email}</b>.
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
