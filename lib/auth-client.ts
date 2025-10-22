import { auth } from "@/lib/firebase";
import type { User } from "firebase/auth";

/**
 * Waits for Firebase Auth to resolve and returns current user.
 * Throws an error if not logged in.
 */
export async function requireAuthUser(): Promise<User> {
  return new Promise((resolve, reject) => {
    const unsub = auth.onAuthStateChanged((user) => {
      unsub();
      if (user) resolve(user);
      else reject(new Error("Not logged in"));
    });
  });
}
