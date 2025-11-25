"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function KYCPendingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState("PENDING");
  const [latestKyc, setLatestKyc] = useState<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Get latest KYC status
      const res = await fetch("/api/partners/kyc/status", {
        credentials: "include",
      });

      const json = await res.json();

      if (!json.ok) {
        router.push("/partner/dashboard");
        return;
      }

      const status = (json.kycStatus || "PENDING").toUpperCase();
      setKycStatus(status);
      setLatestKyc(json.latestKyc || null);

      // Redirect logic
      if (status === "APPROVED") {
        router.push("/partner/dashboard");
      }

      if (status === "REJECTED") {
        router.push("/partner/dashboard/kyc/resubmit");
      }

      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  if (loading) {
    return (
      <DashboardLayout title="KYC Pending">
        <p className="text-center py-10">Checking KYC status…</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="KYC Under Review">
      <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow">
        <h1 className="text-2xl font-bold mb-3">KYC Under Review</h1>
        <p className="text-gray-700 mb-4">
          Your KYC documents have been submitted and are currently under review by our team.
        </p>

        <div className="p-4 rounded bg-yellow-50 border border-yellow-200 text-sm mb-5">
          ⏳ <b>Status:</b> {kycStatus}
        </div>

        {latestKyc?.remarks && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm">
            <b>Admin Remarks:</b>
            <div className="mt-1 text-gray-700">{latestKyc.remarks}</div>
          </div>
        )}

        <button
          onClick={() => router.push("/partner/dashboard")}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg"
        >
          Back to Dashboard
        </button>
      </div>
    </DashboardLayout>
  );
}
