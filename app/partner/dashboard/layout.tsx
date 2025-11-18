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

      const token = await user.getIdToken();

      // Fetch partner profile
      const res = await fetch(`/api/partners/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok || !data.partner) {
        router.push("/partner/onboarding"); // fallback
        return;
      }

      setPartner(data.partner);

      const kyc = data.partner.kycStatus || "not_submitted";

      // -----------------------------------
      // 🚧 REDIRECT LOGIC
      // -----------------------------------

      // 1️⃣ NOT SUBMITTED → always show KYC form
      if (kyc === "not_submitted") {
        if (!pathname.includes("/partner/dashboard/kyc")) {
          router.push("/partner/dashboard/kyc");
        }
      }

      // 2️⃣ PENDING → show pending screen
      if (kyc === "kyc_pending") {
        if (!pathname.includes("/partner/dashboard/kyc/pending")) {
          router.push("/partner/dashboard/kyc/pending");
        }
      }

      // 3️⃣ REJECTED → redirect to re-submit form
      if (kyc === "kyc_rejected") {
        if (!pathname.includes("/partner/dashboard/kyc")) {
          router.push("/partner/dashboard/kyc?resubmit=1");
        }
      }

      // 4️⃣ APPROVED → allow full dashboard
      if (kyc === "kyc_approved") {
        // do nothing → continue normally
      }

      setLoading(false);
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
