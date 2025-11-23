"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase-client";
import { useRouter, usePathname } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function PartnerDashboardLayout({ children }: any) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const user = auth.currentUser;
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const token = await user.getIdToken(true);

      // Fetch partner profile
      const res = await fetch(`/api/partners/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      // ------------------------------------------------
      // ❗ FIXED: fallback must go to /partner/dashboard/kyc,
      // NOT /partner/onboarding (which does NOT exist)
      // ------------------------------------------------
      if (!res.ok || !data?.partner) {
        router.push("/partner/dashboard/kyc");
        return;
      }

      setPartner(data.partner);

      // ------------------------------------------------
      // Normalize KYC status exactly as backend returns
      // ------------------------------------------------
      const raw =
        (data.partner.kycStatus ||
          data.kycStatus ||
          data.partner?.kyc?.status ||
          "NOT_STARTED") + "";

      const kyc = raw.toUpperCase();

      // ------------------------------------------------
      // 🚦 KYC REDIRECT LOGIC (Matches your API)
      // ------------------------------------------------

      // 1) NOT_STARTED or NOT_CREATED → KYC form
      if (kyc === "NOT_STARTED" || kyc === "NOT_CREATED") {
        if (!pathname.includes("/partner/dashboard/kyc")) {
          router.push("/partner/dashboard/kyc");
        }
        return;
      }

      // 2) UNDER_REVIEW → Pending screen
      if (kyc === "UNDER_REVIEW") {
        if (!pathname.includes("/partner/dashboard/kyc/pending")) {
          router.push("/partner/dashboard/kyc/pending");
        }
        return;
      }

      // 3) REJECTED → re-submit
      if (kyc === "REJECTED") {
        if (!pathname.includes("/partner/dashboard/kyc")) {
          router.push("/partner/dashboard/kyc?resubmit=1");
        }
        return;
      }

      // 4) APPROVED → allow full access (no redirect)
      if (kyc === "APPROVED") {
        setLoading(false);
        return;
      }

      // 5) Fallback safety
      router.push("/partner/dashboard/kyc");
    }

    load();
  }, [pathname, router]);

  if (loading || !partner) return <div className="p-6">Loading...</div>;

  return (
    <DashboardLayout title="Partner Dashboard" profile={partner}>
      {children}
    </DashboardLayout>
  );
}
