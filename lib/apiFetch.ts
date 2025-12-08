import { getAuth } from "firebase/auth";

export async function apiFetch(url: string, options: RequestInit = {}) {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User not logged in");
  }

  // ✅ ALWAYS FRESH TOKEN (401 ka permanent fix)
  const token = await user.getIdToken(true);

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`, // ✅ MUST
    },
  });

  return res;
}
