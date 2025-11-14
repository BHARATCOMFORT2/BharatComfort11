"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);

    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    setLoading(false);
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      disabled={loading}
      className="px-4 py-2 bg-red-600 text-white rounded-lg"
    >
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}
