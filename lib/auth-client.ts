import { getAuth, onAuthStateChanged, User } from "firebase/auth";

/**
 * ✅ Safely waits for Firebase Auth user
 * - Avoids null-first race condition
 * - Handles timeout
 * - Production safe
 */
export function requireAuthUser(
  timeoutMs = 8000
): Promise<User> {
  const auth = getAuth();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error("Auth timeout"));
    }, timeoutMs);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return; // ⛔ ignore initial null

      clearTimeout(timer);
      unsubscribe();
      resolve(user);
    });
  });
}
