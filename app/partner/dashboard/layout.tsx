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

      // 🔥 IMPORTANT — NO AUTH HEADER
      // backend only accepts cookies
      const res = await fetch("/api/partners/profile", {
        method: "GET",
        credentials: "include",
      });

      const data = await res.json().catch(() => null);

      const isKycPage = pathname.startsWith("/partner/dashboard/kyc");

      // 🔥 If no partner exists, only allow KYC pages
      if (!res.ok || !data?.partner) {
        if (!isKycPage) {
          router.push("/partner/dashboard/kyc");
          return;
        }
        setLoading(false);
        return;
      }

      setPartner(data.partner);

      // Normalize
      const raw =
        data.partner.kycStatus ||
        data.kycStatus ||
        data.partner.kyc?.status ||
        "NOT_STARTED";

      const kyc = raw.toUpperCase();

      // 🔥 Allow KYC pages always
      if (isKycPage) {
        setLoading(false);
        return;
      }

      // 🔥 Enforce KYC flow
      if (kyc === "NOT_STARTED" || kyc === "NOT_CREATED") {
        router.push("/partner/dashboard/kyc");
        return;
      }

      if (kyc === "UNDER_REVIEW") {
        router.push("/partner/dashboard/kyc/pending");
        return;
      }

      if (kyc === "REJECTED") {
        router.push("/partner/dashboard/kyc?resubmit=1");
        return;
      }

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
