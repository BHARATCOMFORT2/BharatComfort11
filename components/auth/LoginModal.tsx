"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

/* ============================================================
   ✅ TYPE DEFINITION
============================================================ */
interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bookingCallback?: () => void; // ✅ Added optional callback for bookings
}

/* ============================================================
   🧠 COMPONENT
============================================================ */
export default function LoginModal({
  isOpen,
  onClose,
  onSuccess,
  bookingCallback,
}: LoginModalProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ------------------------------------------------------
     🔹 LOGIN USER
  ------------------------------------------------------ */
  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, form.email, form.password);
      const user = cred.user;

      if (!user.emailVerified) {
        setError("Please verify your email before continuing.");
        setLoading(false);
        return;
      }

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        setError("User profile missing. Please contact support.");
        await auth.signOut();
        return;
      }

      setMessage("✅ Login successful!");
      onSuccess(); // Notify parent (update auth state)
      bookingCallback?.(); // ✅ If bookingCallback passed, trigger redirect
      onClose();
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === "auth/invalid-email") setError("Invalid email address.");
      else if (err.code === "auth/wrong-password") setError("Incorrect password.");
      else if (err.code === "auth/user-not-found") setError("User not found.");
      else setError("Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------
     🔹 REGISTER USER
  ------------------------------------------------------ */
  const handleRegister = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const user = cred.user;

      if (form.name) await updateProfile(user, { displayName: form.name });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: form.name,
        email: form.email,
        role: "user",
        phoneVerified: false,
        emailVerified: false,
        createdAt: new Date(),
      });

      await sendEmailVerification(user);
      setMessage("📩 Verification email sent. Please check your inbox.");
      setMode("login");
    } catch (err: any) {
      console.error("Register error:", err);
      if (err.code === "auth/email-already-in-use") setError("Email already registered.");
      else if (err.code === "auth/weak-password") setError("Password must be at least 6 characters.");
      else setError("Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------
     🔹 FORGOT PASSWORD
  ------------------------------------------------------ */
  const handleForgot = async () => {
    setError(null);
    setMessage("📨 Password reset link will be added later (open full page).");
  };

  /* ------------------------------------------------------
     🔹 CLOSE MODAL
  ------------------------------------------------------ */
  const handleClose = () => {
    if (!loading) {
      setError(null);
      setMessage(null);
      setForm({ name: "", email: "", password: "" });
      setMode("login");
      onClose();
    }
  };

  if (!isOpen) return null;

  /* ------------------------------------------------------
     🖼️ UI RENDER
  ------------------------------------------------------ */
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-lg w-full max-w-md relative overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
          >
            <X size={22} />
          </button>

          <div className="p-8 space-y-5">
            <h2 className="text-2xl font-bold text-center text-gray-800">
              {mode === "login"
                ? "Welcome Back"
                : mode === "register"
                ? "Create Account"
                : "Forgot Password"}
            </h2>

            {message && (
              <p className="bg-green-50 text-green-700 p-3 rounded text-sm text-center">
                {message}
              </p>
            )}
            {error && (
              <p className="bg-red-50 text-red-700 p-3 rounded text-sm text-center">
                {error}
              </p>
            )}

            <div className="space-y-4">
              {mode === "register" && (
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-3"
                  required
                />
              )}

              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={form.email}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              />

              {mode !== "forgot" && (
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-3"
                  required
                />
              )}
            </div>

            <div className="flex flex-col gap-3 mt-4">
              {mode === "login" && (
                <>
                  <Button
                    onClick={handleLogin}
                    disabled={loading}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    {loading ? "Logging in..." : "Login"}
                  </Button>
                  <p className="text-center text-sm text-gray-600">
                    Don’t have an account?{" "}
                    <button
                      onClick={() => setMode("register")}
                      className="text-blue-600 hover:underline"
                    >
                      Register
                    </button>
                  </p>
                  <p className="text-center text-sm text-gray-600">
                    <button
                      onClick={() => setMode("forgot")}
                      className="text-blue-600 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </p>
                </>
              )}

              {mode === "register" && (
                <>
                  <Button
                    onClick={handleRegister}
                    disabled={loading}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    {loading ? "Creating..." : "Register"}
                  </Button>
                  <p className="text-center text-sm text-gray-600">
                    Already have an account?{" "}
                    <button
                      onClick={() => setMode("login")}
                      className="text-blue-600 hover:underline"
                    >
                      Login
                    </button>
                  </p>
                </>
              )}

              {mode === "forgot" && (
                <>
                  <Button
                    onClick={handleForgot}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Send Reset Link
                  </Button>
                  <p className="text-center text-sm text-gray-600">
                    Remembered your password?{" "}
                    <button
                      onClick={() => setMode("login")}
                      className="text-blue-600 hover:underline"
                    >
                      Login
                    </button>
                  </p>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
