"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  onAuthStateChanged,
  RecaptchaVerifier,
  linkWithPhoneNumber,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
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

  // OTP State
  const [otp, setOtp] = useState("");
  const confirmationResultRef = useRef<import("firebase/auth").ConfirmationResult | null>(null);
  const recaptchaDivRef = useRef<HTMLDivElement | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Refresh Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, () => {});
    return () => unsub();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  /* ---------------------------------------------------------
     ✅ Ensure reCAPTCHA exists (fixed argument order)
  --------------------------------------------------------- */
  async function ensureRecaptcha() {
    if (recaptchaVerifierRef.current) return recaptchaVerifierRef.current;
    if (!recaptchaDivRef.current) return null;

    // ✅ Correct argument order → (auth, container, options)
    recaptchaVerifierRef.current = new RecaptchaVerifier(
      auth,
      recaptchaDivRef.current,
      { size: "invisible" }
    );

    await recaptchaVerifierRef.current.render();
    return recaptchaVerifierRef.current;
  }

  /* ---------------------------------------------------------
     🧩 Step 1: Register user + send email + phone OTP
  --------------------------------------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!/^\+?\d{10,15}$/.test(form.phone)) {
      setError("Enter valid phone number with country code, e.g. +919876543210");
      return;
    }

    setLoading(true);
    try {
      // 1️⃣ Create Auth user
      const cred = await createUserWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      );
      const user = cred.user;

      // 2️⃣ Save in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        status: form.role === "partner" ? "pending" : "active",
        emailVerified: false,
        phoneVerified: false,
        createdAt: serverTimestamp(),
      });

      // 3️⃣ Send email verification
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      await sendEmailVerification(user, { url: `${appUrl}/auth/verify` });

      // 4️⃣ Send OTP for phone
      const verifier = await ensureRecaptcha();
      if (!verifier) throw new Error("Failed to initialize reCAPTCHA.");
      if (!auth.currentUser) throw new Error("No active user found.");

      confirmationResultRef.current = await linkWithPhoneNumber(
        auth.currentUser,
        form.phone.trim(),
        verifier
      );

      alert("📩 Verification email & OTP sent. Please check inbox and phone.");
      setStep("otp");
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err?.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------
     📱 Step 2: Verify OTP
  --------------------------------------------------------- */
  const handleVerifyOtp = async () => {
    if (!otp) return setError("Enter 6-digit OTP.");
    if (!confirmationResultRef.current)
      return setError("OTP session expired. Please re-register.");

    setLoading(true);
    setError("");
    try {
      const result = await confirmationResultRef.current.confirm(otp);
      const linkedUser = result.user;

      await updateDoc(doc(db, "users", linkedUser.uid), {
        phoneVerified: true,
      });

      setStep("done");
    } catch (err: any) {
      console.error("OTP verification error:", err);
      setError(err?.message || "Invalid OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------
     🎉 Step 3: Redirect to verify page
  --------------------------------------------------------- */
  const handleGoToVerifyPage = () => {
    router.push("/auth/verify");
  };

  /* ---------------------------------------------------------
     🖼️ UI Rendering
  --------------------------------------------------------- */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        {/* STEP 1: REGISTER FORM */}
        {step === "form" && (
          <>
            <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
              Create Account
            </h1>

            {error && (
              <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</p>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Full Name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleChange}
                required
              />
              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
              <Input
                label="Phone (with country code)"
                name="phone"
                type="tel"
                placeholder="+919876543210"
                value={form.phone}
                onChange={handleChange}
                required
              />

              {/* Password field */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-3 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Confirm password */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-3 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
                >
                  {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Role selector */}
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

            <div ref={recaptchaDivRef} id="recaptcha-register" />
          </>
        )}

        {/* STEP 2: OTP */}
        {step === "otp" && (
          <>
            <h2 className="text-2xl font-semibold text-center mb-4">
              Verify Phone Number
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              OTP sent to <b>{form.phone}</b>. Also check your email <b>{form.email}</b> for verification link.
            </p>

            {error && (
              <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</p>
            )}

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

        {/* STEP 3: DONE */}
        {step === "done" && (
          <>
            <h2 className="text-2xl font-semibold text-center mb-4">All Set! 🎉</h2>
            <p className="text-gray-700 text-center">
              Your phone number is verified. Please verify your email by clicking the link we sent to <b>{form.email}</b>.
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
