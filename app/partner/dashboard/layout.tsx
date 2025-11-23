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

      const res = await fetch("/api/partners/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => null);

      // -------------------------------------------------------
      // ALLOW → /partner/dashboard/kyc AND /partner/dashboard/kyc/pending
      // -------------------------------------------------------
      const isKycPage =
        pathname === "/partner/dashboard/kyc" ||
        pathname.startsWith("/partner/dashboard/kyc/");

      // No partner doc yet
      if (!res.ok || !data?.partner) {
        if (!isKycPage) {
          router.push("/partner/dashboard/kyc");
          return;
        }
        setLoading(false);
        return;
      }

      setPartner(data.partner);

      const raw =
        data.partner.kycStatus ||
        data.kycStatus ||
        data.partner?.kyc?.status ||
        "NOT_STARTED";

      const kyc = raw.toUpperCase();

      // If currently on a KYC page → allow it
      if (isKycPage) {
        setLoading(false);
        return;
      }

      // -------------------------------------------------------
      // REDIRECTS BASED ON STATUS
      // -------------------------------------------------------

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
