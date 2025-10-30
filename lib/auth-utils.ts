import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  getIdToken,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

/* ==========================================================
   🔐 BASIC AUTH HELPERS
========================================================== */

/**
 * Register a new user (email + password)
 * Creates user in Firebase Auth + Firestore
 */
export const registerUser = async (
  email: string,
  password: string,
  name: string,
  phone: string,
  role: "user" | "partner" = "user"
) => {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const user = cred.user;

  // Create user profile in Firestore
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email,
    name: name.trim(),
    phone: phone.trim(),
    role,
    status: role === "partner" ? "pending" : "active",
    emailVerified: false,
    phoneVerified: false,
    createdAt: serverTimestamp(),
  });

  // Send verification email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
  await sendEmailVerification(user, { url: `${appUrl}/auth/verify` });

  return user;
};

/**
 * Login user with email + password
 */
export const loginUser = async (email: string, password: string) => {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
};

/**
 * Logout user
 */
export const logoutUser = async () => {
  await signOut(auth);
};

/**
 * Listen to auth state changes
 */
export const getCurrentUser = () =>
  new Promise<User | null>((resolve) => {
    onAuthStateChanged(auth, (user) => resolve(user));
  });

/**
 * Get Firebase ID Token (used for API session verification)
 */
export const getToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user found.");
  return await getIdToken(user, true);
};

/* ==========================================================
   📱 PHONE AUTH HELPERS
========================================================== */

/**
 * Initialize invisible reCAPTCHA (for phone login)
 */
export const initRecaptcha = (containerId = "recaptcha-container") => {
  if (typeof window === "undefined") return null;
  if (!auth) return null;
  try {
    return new RecaptchaVerifier(auth, containerId, { size: "invisible" });
  } catch {
    return null; // prevent multiple initializations
  }
};

/**
 * Send OTP to phone
 */
export const sendPhoneOtp = async (phone: string, verifier: RecaptchaVerifier) => {
  if (!/^\+?\d{10,15}$/.test(phone)) throw new Error("Invalid phone format.");
  return await signInWithPhoneNumber(auth, phone.trim(), verifier);
};

/**
 * Verify OTP & update Firestore
 */
export const verifyPhoneOtp = async (confirmationResult: any, otp: string) => {
  const result = await confirmationResult.confirm(otp.trim());
  const user = result.user;

  await updateDoc(doc(db, "users", user.uid), {
    phoneVerified: true,
    phone: user.phoneNumber,
  });

  return user;
};

/* ==========================================================
   🧾 USER PROFILE UTILITIES
========================================================== */

/**
 * Fetch user document from Firestore
 */
export const getUserProfile = async (uid: string) => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
};

/**
 * Update user document
 */
export const updateUserProfile = async (uid: string, data: any) => {
  await updateDoc(doc(db, "users", uid), data);
};

/**
 * Check if user is verified (email + phone)
 */
export const isFullyVerified = (user: any, profile: any) => {
  return user?.emailVerified && (profile?.phoneVerified || user?.phoneNumber);
};

/**
 * Check role helpers
 */
export const isAdmin = (profile: any) => profile?.role === "admin";
export const isPartner = (profile: any) => profile?.role === "partner";
export const isUser = (profile: any) => profile?.role === "user";

/* ==========================================================
   🧠 SERVER-SIDE ADMIN HELPERS (for API routes)
========================================================== */

import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps, cert } from "firebase-admin/app";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const adminAuth = getAuth();

/**
 * Verify Firebase ID token (used in /api routes)
 */
export const verifyAdminToken = async (token: string) => {
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded;
  } catch (err) {
    console.error("Token verification failed:", err);
    throw new Error("Unauthorized access.");
  }
};

/**
 * Ensure user role for protected APIs
 */
export const requireRole = (decoded: any, role: string) => {
  if (decoded.role !== role) throw new Error("Forbidden: insufficient role.");
};

/* ==========================================================
   ⚙️ MISC UTILITIES
========================================================== */

/**
 * Refresh user and Firestore verification flags
 */
export const refreshUserVerification = async (uid: string) => {
  await auth.currentUser?.reload();
  const user = auth.currentUser;
  if (user?.emailVerified) {
    await updateDoc(doc(db, "users", uid), { emailVerified: true });
  }
};
