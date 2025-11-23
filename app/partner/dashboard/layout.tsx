"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";   // ✅ FIXED
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

      // ❌ user == null → infinite redirect
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const token = await user.getIdToken(true);

      const res = await fetch(`/api/partners/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      // Fallback when partner not created
      if (!res.ok || !data?.partner) {
        router.push("/partner/dashboard/kyc");
        return;
      }

      setPartner(data.partner);

      const raw =
        (data.partner.kycStatus ||
          data.kycStatus ||
          data.partner?.kyc?.status ||
          "NOT_STARTED") + "";

      const kyc = raw.toUpperCase();

      // KYC ROUTING LOGIC
      if (kyc === "NOT_STARTED" || kyc === "NOT_CREATED") {
        if (!pathname.includes("/partner/dashboard/kyc")) {
          router.push("/partner/dashboard/kyc");
        }
        return;
      }

      if (kyc === "UNDER_REVIEW") {
        if (!pathname.includes("/partner/dashboard/kyc/pending")) {
          router.push("/partner/dashboard/kyc/pending");
        }
        return;
      }

      if (kyc === "REJECTED") {
        if (!pathname.includes("/partner/dashboard/kyc")) {
          router.push("/partner/dashboard/kyc?resubmit=1");
        }
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

  if (loading || !partner) return <div className="p-6">Loading...</div>;

  return (
    <DashboardLayout title="Partner Dashboard" profile={partner}>
      {children}
    </DashboardLayout>
  );
}
