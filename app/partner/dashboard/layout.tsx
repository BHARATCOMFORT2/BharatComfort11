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
  bank?: any;
  address?: any;
  [key: string]: any;
};

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

        // Agar partner doc hi nahi mila ya API error → login par bhejo
        if (!res.ok || !data?.partner) {
          if (!cancelled) {
            setLoading(false);
            router.replace("/auth/login");
          }
          return;
        }

        const partnerData = data.partner || {};

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
          bank: partnerData.bank || undefined,
          address: partnerData.address || undefined,
        };

        if (cancelled) return;

        setPartner(normalizedPartner);
        setLoading(false);
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
  }, [router, pathname]);

  if (loading) {
    return <div className="p-6">Loading partner dashboard...</div>;
  }

  // Dashboard header profile (unchanged logic)
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
