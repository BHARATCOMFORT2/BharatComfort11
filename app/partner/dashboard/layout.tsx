"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase-client";
import { useRouter, usePathname } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function PartnerDashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState(null);

  useEffect(() => {
    async function load() {
      const user = auth.currentUser;

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const token = await user.getIdToken(true);

      // Fetch profile
      const res = await fetch("/api/partners/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => null);

      // ----------------------------------------------------
      // 🛑 FIX 1: Allow KYC pages without redirect lock
      // ----------------------------------------------------
      const isKycPage =
        pathname.startsWith("/partner/dashboard/kyc");

      // ----------------------------------------------------
      // 🛑 FIX 2: If NO partner document exists → only allow KYC page
      // ----------------------------------------------------
      if (!res.ok || !data?.partner) {
        if (!isKycPage) {
          router.push("/partner/dashboard/kyc");
          return;
        }
        setLoading(false);
        return;
      }

      setPartner(data.partner);

      // ----------------------------------------------------
      // Normalize status
      // ----------------------------------------------------
      const raw =
        data.partner.kycStatus ||
        data.kycStatus ||
        data.partner?.kyc?.status ||
        "NOT_STARTED";

      const kyc = raw.toUpperCase();

      // ----------------------------------------------------
      // 🛑 FIX 3: Allow access to KYC pages without loop
      // ----------------------------------------------------
      if (isKycPage) {
        setLoading(false);
        return;
      }

      // ----------------------------------------------------
      // 🚦 KYC REDIRECT LOGIC
      // ----------------------------------------------------

      // Not submitted → go to KYC
      if (kyc === "NOT_STARTED" || kyc === "NOT_CREATED") {
        router.push("/partner/dashboard/kyc");
        return;
      }

      // Under review → pending page
      if (kyc === "UNDER_REVIEW") {
        router.push("/partner/dashboard/kyc/pending");
        return;
      }

      // Rejected → resubmit page
      if (kyc === "REJECTED") {
        router.push("/partner/dashboard/kyc?resubmit=1");
        return;
      }

      // APPROVED → allow dashboard normally
      if (kyc === "APPROVED") {
        setLoading(false);
        return;
      }

      // fallback
      router.push("/partner/dashboard/kyc");
    }

    load();
  }, [pathname, router]);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <DashboardLayout title="Partner Dashboard" profile={partner}>
      {children}
    </DashboardLayout>
  );
}
