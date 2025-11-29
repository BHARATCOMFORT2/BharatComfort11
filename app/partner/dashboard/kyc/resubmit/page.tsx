"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase-client";
import { onAuthStateChanged } from "firebase/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import toast from "react-hot-toast";

export default function KYCResubmitPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [partner, setPartner] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  // form fields
  const [aadhaar, setAadhaar] = useState("");
  const [gst, setGst] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");

  // files
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [gstFile, setGstFile] = useState<File | null>(null);

  useEffect(() => {
    let mounted = true;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }

      try {
        const res = await fetch("/api/partners/profile", {
          credentials: "include",
        });
        const j = await res.json().catch(() => null);

        if (!mounted) return;

        const kycStatus =
          j?.kycStatus ||
          j?.partner?.kycStatus ||
          j?.partner?.kyc?.status;

        // ✅ If already approved, go to dashboard
        if (kycStatus === "APPROVED") {
          router.push("/partner/dashboard");
          return;
        }

        // ✅ If not rejected, send back to pending
        if (kycStatus !== "REJECTED") {
          router.push("/partner/dashboard/kyc/pending");
          return;
        }

        // ✅ Prefill fields
        if (j?.partner) {
          setPartner(j.partner);
          setBusinessName(j.partner.businessName || "");
          setPhone(j.partner.phone || "");
          setAadhaar(j.partner.aadhaarLast4 || "");
          setGst(j.partner.gstNumber || "");
          setRejectionReason(j.partner.kycRejectionReason || "");
        }
      } catch (err) {
        console.error("KYC resubmit load error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [router]);

  async function uploadFile(file: File, docType: string) {
    if (!file) return null;

    const form = new FormData();
    form.append("docType", docType);
    form.append("file", file);

    const res = await fetch("/api/partners/kyc/upload", {
      method: "POST",
      body: form,
      credentials: "include",
    });

    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.success) {
      throw new Error(j?.error || "File upload failed");
    }
    return j.storagePath;
  }

  async function handleResubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!businessName || !phone || !aadhaar) {
      toast.error("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    try {
      let aadhaarPath = null;
      let gstPath = null;

      if (aadhaarFile) aadhaarPath = await uploadFile(aadhaarFile, "aadhaar");
      if (gstFile) gstPath = await uploadFile(gstFile, "gst");

      const res = await fetch("/api/partners/kyc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          isResubmission: true,
          businessName,
          phone,
          aadhaar,
          gstNumber: gst || null,
          documents: [
            aadhaarPath && { docType: "AADHAAR", storagePath: aadhaarPath },
            gstPath && { docType: "GST", storagePath: gstPath },
          ].filter(Boolean),
        }),
      });

      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.success) {
        throw new Error(j?.error || "Resubmission failed");
      }

      toast.success("✅ KYC resubmitted successfully");
      router.push("/partner/dashboard/kyc/pending");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to resubmit KYC");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Resubmit KYC">
        <div className="p-6 text-center">Loading KYC data…</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Resubmit KYC">
      <div className="max-w-2xl mx-auto mt-8 bg-white p-6 rounded-2xl shadow">
        <h2 className="text-2xl font-bold mb-2 text-red-600">
          ❌ KYC Rejected
        </h2>

        {rejectionReason && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            <b>Reason:</b> {rejectionReason}
          </div>
        )}

        <form onSubmit={handleResubmit} className="space-y-4">
          <div>
            <label className="block text-sm">Business Name</label>
            <input
              className="border rounded p-2 w-full"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm">Phone</label>
            <input
              className="border rounded p-2 w-full"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm">Aadhaar Last 4 Digits</label>
            <input
              className="border rounded p-2 w-full"
              value={aadhaar}
              onChange={(e) => setAadhaar(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm">GST Number (optional)</label>
            <input
              className="border rounded p-2 w-full"
              value={gst}
              onChange={(e) => setGst(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm">New Aadhaar File</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)}
            />
          </div>

          <div>
            <label className="block text-sm">New GST File (optional)</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setGstFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push("/partner/dashboard")}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-red-600 text-white rounded"
            >
              {submitting ? "Submitting..." : "Resubmit KYC"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
