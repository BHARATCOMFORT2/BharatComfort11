"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser: user, loading } = useAuth();
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkVerification() {
      if (!user && !loading) {
        router.push("/auth/login");
      } else if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (!data.isActive) {
            router.push("/auth/verify");
          } else {
            setIsActive(true);
          }
        }
      }
    }
    checkVerification();
  }, [user, loading, router]);

  if (loading || isActive === null) {
    return <p className="p-6 text-center">Checking access...</p>;
  }

  return <>{children}</>;
}
