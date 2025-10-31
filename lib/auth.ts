// lib/auth.ts
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";

/* ============================================================
   🧩 REGISTER NEW USER  — Email + Password
   (phone/email verification handled in register page)
============================================================ */
export async function registerUser(
  email: string,
  password: string,
  displayName: string,
  role: "user" | "partner" | "staff" | "admin" = "user"
): Promise<User> {
  // Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Add name to Auth profile
  if (displayName) {
    await updateProfile(user, { displayName });
  }

  // Store Firestore profile
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, {
    uid: user.uid,
    email,
    displayName,
    role,
    status: role === "partner" ? "pending" : "active",
    emailVerified: user.emailVerified || false,
    phoneVerified: false,
    createdAt: serverTimestamp(),
  });

  return user;
}

/* ============================================================
   🔐 LOGIN EXISTING USER
============================================================ */
export async function loginUser(email: string, password: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Ensure Firestore profile consistency
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const data = snap.data();
    if (data.emailVerified !== user.emailVerified) {
      await updateDoc(userRef, { emailVerified: user.emailVerified });
    }
  }

  return user;
}

/* ============================================================
   🚪 LOGOUT
============================================================ */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/* ============================================================
   🔑 PASSWORD RESET
============================================================ */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email, {
    url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/login`,
  });
}

/* ============================================================
   🧠 USER ROLE HELPERS
============================================================ */
export async function getUserRole(uid: string): Promise<string> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data().role || "user";
  }
  return "user";
}

export async function hasRole(uid: string, requiredRole: string): Promise<boolean> {
  const role = await getUserRole(uid);
  return role === requiredRole;
}
