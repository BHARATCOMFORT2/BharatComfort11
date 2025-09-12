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
import { doc, setDoc, getDoc } from "firebase/firestore";

// ✅ Register new user with role
export async function registerUser(
  email: string,
  password: string,
  displayName: string,
  role: "user" | "partner" | "staff" | "admin" = "user"
): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);

  if (displayName) {
    await updateProfile(userCredential.user, { displayName });
  }

  // Save role in Firestore under users collection
  const userRef = doc(db, "users", userCredential.user.uid);
  await setDoc(userRef, {
    uid: userCredential.user.uid,
    email,
    displayName,
    role,
    createdAt: new Date(),
  });

  return userCredential.user;
}

// ✅ Login user
export async function loginUser(email: string, password: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

// ✅ Logout user
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// ✅ Send password reset email
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

// ✅ Get user role from Firestore
export async function getUserRole(uid: string): Promise<string> {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return userSnap.data().role || "user";
  }
  return "user";
}

// ✅ Check role
export async function hasRole(uid: string, requiredRole: string): Promise<boolean> {
  const role = await getUserRole(uid);
  return role === requiredRole;
}
