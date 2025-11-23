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

      // Fetch profile
      const res = await fetch("/api/partners/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok || !data?.partner) {
        // No partner doc yet → allow them into KYC page
        if (!pathname.includes("/partner/dashboard/kyc")) {
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

      // --------------------------------------------
      // 🚦 KYC Redirect Logic (Fixed Version)
      // --------------------------------------------

      // NOT_STARTED → allow KYC page access, no redirect loop
      if (kyc === "NOT_STARTED" || kyc === "NOT_CREATED") {
        if (!pathname.includes("/partner/dashboard/kyc")) {
          router.push("/partner/dashboard/kyc");
          return;
        }
        setLoading(false);
        return;
      }

      // UNDER_REVIEW → go to pending page
      if (kyc === "UNDER_REVIEW") {
        if (!pathname.includes("/partner/dashboard/kyc/pending")) {
          router.push("/partner/dashboard/kyc/pending");
          return;
        }
        setLoading(false);
        return;
      }

      // REJECTED → go to KYC page with resubmit flag
      if (kyc === "REJECTED") {
        if (!pathname.includes("/partner/dashboard/kyc")) {
          router.push("/partner/dashboard/kyc?resubmit=1");
          return;
        }
        setLoading(false);
        return;
      }

      // APPROVED → allow dashboard normally
      if (kyc === "APPROVED") {
        setLoading(false);
        return;
      }

      // Fallback
      setLoading(false);
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
