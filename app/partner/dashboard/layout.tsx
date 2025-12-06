"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "@/lib/firebase-client";
import { onAuthStateChanged } from "firebase/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

type PartnerDashboardLayoutProps = {
  children: ReactNode;
};

type PartnerProfile = {
  uid?: string;
  name?: string;
  displayName?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  profilePic?: string;
  status?: string;
  kycStatus?: string;
  kyc?: { status?: string };
  [key: string]: any;
};

function normalizeKyc(raw?: string | null): string {
  if (!raw) return "NOT_STARTED";
  return String(raw).toUpperCase();
}

export default function PartnerDashboardLayout({
  children,
}: PartnerDashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<PartnerProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          if (!cancelled) {
            setLoading(false);
            router.replace("/auth/login");
          }
          return;
        }

        // KYC page check
        const isKycPage = pathname.startsWith("/partner/dashboard/kyc");

        // Secure cookie-based profile fetch
        const res = await fetch("/api/partners/profile", {
          method: "GET",
          credentials: "include",
        });

        let data: any = null;
        try {
          data = await res.json();
        } catch {
          data = null;
        }

        // 🔒 Agar partner doc hi nahi mila ya API error → KYC par bhejo
        if (!res.ok || !data?.partner) {
          if (!cancelled) {
            if (!isKycPage) {
              router.replace("/partner/dashboard/kyc");
              return;
            }
            // KYC page par ho → bas loading hata do, empty profile chalega
            setPartner(null);
            setLoading(false);
          }
          return;
        }

        const partnerData = data.partner || {};

        // Normalize KYC value
        const rawKyc =
          partnerData.kycStatus ||
          partnerData.kyc?.status ||
          data.kycStatus ||
          "NOT_STARTED";

        const kyc = normalizeKyc(rawKyc);

        const normalizedPartner: PartnerProfile = {
          uid: partnerData.uid || data.uid || user.uid,
          name:
            partnerData.name ||
            partnerData.displayName ||
            partnerData.businessName ||
            user.displayName ||
            undefined,
          displayName:
            partnerData.displayName ||
            partnerData.businessName ||
            partnerData.name ||
            undefined,
          businessName: partnerData.businessName || undefined,
          email: partnerData.email || user.email || undefined,
          phone: partnerData.phone || user.phoneNumber || undefined,
          profilePic: partnerData.profilePic || undefined,
          status: partnerData.status || data.onboardingStatus || undefined,
          kycStatus: kyc,
          kyc: partnerData.kyc || undefined,
          bank: partnerData.bank || undefined,
          address: partnerData.address || undefined,
        };

        if (cancelled) return;

        setPartner(normalizedPartner);

        // 🔁 Already on any KYC URL → allow render (KYC page itself handle UI)
        if (isKycPage) {
          setLoading(false);
          return;
        }

        // 🚦 AUTO REDIRECT RULES (same logic as login)
        if (kyc === "NOT_STARTED" || kyc === "NOT_CREATED") {
          router.replace("/partner/dashboard/kyc");
          return;
        }

        if (kyc === "UNDER_REVIEW" || kyc === "SUBMITTED") {
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

        // Fallback – agar kuch aur status aaya to bhi KYC par le jao
        router.replace("/partner/dashboard/kyc");
      } catch (err) {
        console.error("Partner dashboard auth error:", err);
        if (!cancelled) {
          setLoading(false);
          router.replace("/auth/login");
        }
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [pathname, router]);

  if (loading) {
    return <div className="p-6">Loading partner dashboard...</div>;
  }

  // DashboardLayout ko minimal profile object de dete hain
  const headerProfile = partner
    ? {
        name:
          partner.businessName ||
          partner.displayName ||
          partner.name ||
          "Partner",
        role: "partner",
        profilePic: partner.profilePic,
      }
    : {
        name: "Partner",
        role: "partner",
      };

  return (
    <DashboardLayout title="Partner Dashboard" profile={headerProfile}>
      {children}
    </DashboardLayout>
  );
}
