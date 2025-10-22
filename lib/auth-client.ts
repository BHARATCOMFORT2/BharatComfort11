import { auth } from "@/lib/firebase";

/**
 * Waits for Firebase Auth to resolve and returns current user.
 * If no user, throws error.
 */
export async function requireAuthUser() {
  return new Promise((resolve, reject) => {
    const unsub = auth.onAuthStateChanged((user) => {
      unsub();
      if (user) resolve(user);
      else reject(new Error("Not logged in"));
    });
  });
}
