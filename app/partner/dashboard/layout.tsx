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
      try {
        const user = auth.currentUser;

        if (!user) {
          router.replace("/auth/login");
          return;
        }

        // ✅ Cookie-based secure call (as per your backend)
        const res = await fetch("/api/partners/profile", {
          method: "GET",
          credentials: "include",
        });

        let data = null;
        try {
          data = await res.json();
        } catch {
          data = null;
        }

        const isKycPage = pathname.startsWith("/partner/dashboard/kyc");

        // ✅ If API fails or partner doc missing → force KYC/home
        if (!res.ok || !data?.partner) {
          if (!isKycPage) {
            router.replace("/partner/dashboard/kyc");
            return;
          }
          setLoading(false);
          return;
        }

        setPartner(data.partner);

        // ✅ Normalize all possible KYC sources
        const raw =
          data.partner?.kycStatus ||
          data.partner?.kyc?.status ||
          "NOT_STARTED";

        const kyc = String(raw).toUpperCase();

        // ✅ If already on any KYC page → allow
        if (isKycPage) {
          setLoading(false);
          return;
        }

        // ✅ AUTO REDIRECT RULES
        if (kyc === "NOT_STARTED" || kyc === "NOT_CREATED") {
          router.replace("/partner/dashboard/kyc");
          return;
        }

        if (kyc === "UNDER_REVIEW") {
          router.replace("/partner/dashboard/kyc/pending");
          return;
        }

        if (kyc === "REJECTED") {
          router.replace("/partner/dashboard/kyc?resubmit=1");
          return;
        }

        if (kyc === "APPROVED") {
          setLoading(false);
          return;
        }

        // ✅ Fallback
        router.replace("/partner/dashboard/kyc");
      } catch (err) {
        console.error("Partner dashboard auth error:", err);
        router.replace("/auth/login");
      }
    }

    load();
  }, [pathname, router]);

  if (loading) {
    return <div className="p-6">Loading partner dashboard...</div>;
  }

  return (
    <DashboardLayout title="Partner Dashboard" profile={partner}>
      {children}
    </DashboardLayout>
  );
}
