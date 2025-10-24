"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  linkWithPhoneNumber,
  RecaptchaVerifier,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import Input from "@/components/forms/Input";
import Button from "@/components/forms/Button";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  // step = "form" | "otp" | "done"
  const [step, setStep] = useState<"form" | "otp" | "done">("form");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "", // +91xxxxxxxxxx
    password: "",
    confirmPassword: "",
    role: "user",
  });
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // OTP state
  const [otp, setOtp] = useState("");
  const confirmationResultRef = useRef<import("firebase/auth").ConfirmationResult | null>(null);
  const recaptchaDivRef = useRef<HTMLDivElement | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // keep auth user fresh (useful after link)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, () => {});
    return () => unsub();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  async function ensureRecaptcha() {
    if (recaptchaVerifierRef.current) return recaptchaVerifierRef.current;
    if (!recaptchaDivRef.current) return null;

    recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaDivRef.current, {
      size: "invisible", // invisible keeps UI clean
    });

    await recaptchaVerifierRef.current.render();
    return recaptchaVerifierRef.current;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // small validations
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!/^\+?\d{10,15}$/.test(form.phone)) {
      setError("Enter phone with country code, e.g. +919876543210");
      return;
    }

    setLoading(true);
    try {
      // 1) Create Auth user (email/password)
      const cred = await createUserWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      );
      const user = cred.user;

      // 2) Create Firestore profile (pre-verified flags)
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role, // user | partner
        status: form.role === "partner" ? "pending" : "active",
        emailVerified: false,
        phoneVerified: false,
        createdAt: serverTimestamp(),
      });

      // 3) Send email verification
      await sendEmailVerification(user, {
        url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/auth/verify`,
      });

      // 4) Start phone linking with OTP
      const verifier = await ensureRecaptcha();
      if (!verifier) throw new Error("Failed to initialize reCAPTCHA.");
      confirmationResultRef.current = await linkWithPhoneNumber(
        user,
        form.phone.trim(),
        verifier
      );

      // go to OTP step
      setStep("otp");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return setError("Enter the 6-digit OTP.");
    if (!confirmationResultRef.current) return setError("OTP session expired. Please re-register.");

    setLoading(true);
    setError("");
    try {
      const result = await confirmationResultRef.current.confirm(otp);
      const linkedUser = result.user;

      // set phoneVerified true
      await updateDoc(doc(db, "users", linkedUser.uid), { phoneVerified: true });

      setStep("done");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Invalid OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToVerifyPage = () => {
    router.push("/auth/verify");
  };

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

              {/* password */}
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

              {/* confirm */}
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

              {/* role */}
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

            {/* Invisible reCAPTCHA anchor */}
            <div ref={recaptchaDivRef} id="recaptcha-register" />
          </>
        )}

        {step === "otp" && (
          <>
            <h2 className="text-2xl font-semibold text-center mb-4">
              Verify Phone Number
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              We’ve sent an OTP to <b>{form.phone}</b>. Enter it below to verify your
              phone. We also sent a verification email to <b>{form.email}</b>.
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

            <p className="text-xs text-gray-500 mt-3">
              Didn’t get OTP? Wait a few seconds and try registering again.
            </p>
          </>
        )}

        {step === "done" && (
          <>
            <h2 className="text-2xl font-semibold text-center mb-4">All Set! 🎉</h2>
            <p className="text-gray-700">
              Your phone number is verified. Please verify your email by clicking the
              link we sent to <b>{form.email}</b>. Once verified, you can continue.
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
