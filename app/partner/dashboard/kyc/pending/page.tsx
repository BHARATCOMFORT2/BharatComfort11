"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase-client";
import { onAuthStateChanged } from "firebase/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function KYCPendingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("UNDER_REVIEW");
  const [partner, setPartner] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/auth/login");
        return;
      }

      try {
        const res = await fetch("/api/partners/profile", {
          credentials: "include",
        });

        const j = await res.json().catch(() => null);

        if (!mounted) return;

        if (j?.partner) {
          const rawKyc =
            j.kycStatus ||
            j.partner?.kycStatus ||
            j.partner?.kyc?.status ||
            "UNDER_REVIEW";

          const normalized = String(rawKyc).toUpperCase();

          setStatus(normalized);
          setPartner(j.partner);

          // ✅ AUTO REDIRECT — FINAL AUTHORITY
          if (normalized === "APPROVED") {
            router.replace("/partner/dashboard");
            return;
          }

          if (normalized === "REJECTED") {
            router.replace("/partner/dashboard/kyc/resubmit");
            return;
          }

          // ✅ Else stay on pending page
        }
      } catch (e) {
        console.error("KYC Pending load error:", e);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [router]);

  if (loading) {
    return (
      <DashboardLayout title="KYC Status">
        <div className="p-6 text-center">Loading KYC status…</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="KYC Under Review">
      <div className="max-w-2xl mx-auto mt-10 bg-yellow-50 border border-yellow-300 rounded-2xl p-6 text-center shadow">
        <h2 className="text-2xl font-bold text-yellow-800 mb-2">
          🕒 KYC Under Review
        </h2>

        <p className="text-yellow-700 mb-4">
          Your KYC has been successfully submitted and is currently under
          verification. Our team usually verifies within 24–48 hours.
        </p>

        {partner?.businessName && (
          <div className="bg-white rounded-xl p-4 mb-4 text-left text-sm shadow">
            <p>
              <b>Business:</b> {partner.businessName}
            </p>
            <p>
              <b>Phone:</b> {partner.phone}
            </p>
            <p>
              <b>Status:</b>{" "}
              <span className="text-yellow-700 font-semibold">
                {status}
              </span>
            </p>
          </div>
        )}

        <div className="flex justify-center gap-4 mt-4">
          <button
            onClick={() => router.push("/partner/dashboard")}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg"
          >
            Go to Dashboard
          </button>

          <button
            onClick={() => router.refresh()}
            className="px-4 py-2 bg-yellow-700 text-white rounded-lg"
          >
            Refresh Status
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
