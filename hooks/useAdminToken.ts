"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Central Admin Token Hook
 * - Firebase ID token fetch karta hai
 * - Auto refresh (force refresh once)
 * - Empty / expired token se bachata hai
 */
export function useAdminToken() {
  const { firebaseUser, profile, loading } = useAuth();

  const [token, setToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadToken = async () => {
      if (!firebaseUser || loading) {
        setTokenLoading(false);
        return;
      }

      try {
        const t = await firebaseUser.getIdToken(true); // 🔥 force refresh
        if (mounted) setToken(t);
      } catch (err) {
        console.error("❌ Failed to fetch admin token", err);
        if (mounted) setToken(null);
      } finally {
        if (mounted) setTokenLoading(false);
      }
    };

    loadToken();

    return () => {
      mounted = false;
    };
  }, [firebaseUser, loading]);

  const isAdmin =
    profile?.role === "admin" || profile?.role === "superadmin";

  return {
    token,
    tokenLoading,
    isAdmin,
    ready: !!token && isAdmin && !tokenLoading,
  };
}
