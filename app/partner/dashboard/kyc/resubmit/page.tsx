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

  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
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

  // ✅ Load current user + partner + rejection reason
  useEffect(() => {
    let mounted = true;

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/auth/login");
        return;
      }

      if (!mounted) return;

      setUser(u);
      const t = await u.getIdToken(true);
      setToken(t);

      try {
        const res = await fetch("/api/partners/profile", {
          credentials: "include",
        });

        const j = await res.json().catch(() => null);
        if (!mounted) return;

        const rawKyc =
          j?.kycStatus ||
          j?.partner?.kycStatus ||
          j?.partner?.kyc?.status ||
          "NOT_STARTED";

        const kycStatus = String(rawKyc).toUpperCase();

        // ✅ Already approved → direct dashboard
        if (kycStatus === "APPROVED") {
          router.replace("/partner/dashboard");
          return;
        }

        // ✅ Not rejected → send to pending page
        if (kycStatus !== "REJECTED") {
          router.replace("/partner/dashboard/kyc/pending");
          return;
        }

        // ✅ REJECTED → show resubmit form with prefilled data
        if (j?.partner) {
          const p = j.partner;
          setPartner(p);

          setBusinessName(p.businessName || "");
          setPhone(p.phone || "");
          setGst(p.gstNumber || "");

          // we only store last4 in backend, so show that as hint
          const last4 =
            p.aadhaarLast4 ||
            p.kyc?.aadhaarLast4 ||
            (typeof p.kyc?.idNumberMasked === "string"
              ? p.kyc.idNumberMasked.slice(-4)
              : "");

          setAadhaar(last4 || "");
          setRejectionReason(
            p.kycRejectionReason ||
              p.kyc?.rejectionReason ||
              "Your KYC was rejected. Please fix the details and re-upload documents."
          );
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

  // ✅ File upload helper (same pattern as main KYC page)
  async function uploadFile(file: File, docType: string) {
    if (!file) return null;
    if (!user || !token) throw new Error("Not authenticated");

    const form = new FormData();
    form.append("partnerId", user.uid);
    form.append("token", token);
    form.append("docType", docType); // keep consistent: "aadhaar_file" / "gst_file"
    form.append("file", file);

    const res = await fetch("/api/partners/kyc/upload", {
      method: "POST",
      body: form,
    });

    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.success) {
      throw new Error(j?.error || "File upload failed");
    }

    return j.storagePath as string;
  }

  async function handleResubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!businessName.trim() || !phone.trim() || !aadhaar.trim()) {
      toast.error("Please fill all required fields");
      return;
    }

    // Aadhaar can be last 4 only (UI label), backend will mask automatically
    const aadClean = aadhaar.replace(/\D/g, "");
    if (aadClean.length < 4) {
      toast.error("Enter last 4 digits of Aadhaar");
      return;
    }

    setSubmitting(true);
    try {
      let aadhaarPath: string | null = null;
      let gstPath: string | null = null;

      if (aadhaarFile) {
        aadhaarPath = await uploadFile(aadhaarFile, "aadhaar_file");
      }
      if (gstFile) {
        gstPath = await uploadFile(gstFile, "gst_file");
      }

      const documents: { docType: string; storagePath: string }[] = [];
      if (aadhaarPath) {
        documents.push({ docType: "aadhaar_file", storagePath: aadhaarPath });
      }
      if (gstPath) {
        documents.push({ docType: "gst_file", storagePath: gstPath });
      }

      const res = await fetch("/api/partners/kyc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          isResubmission: true,
          businessName: businessName.trim(),
          phone: phone.trim(),
          aadhaar: aadClean, // backend will keep only last 4, mask as XXXXXXXX1234
          gstNumber: gst.trim() || null,
          documents,
        }),
      });

      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.success) {
        throw new Error(j?.error || "Resubmission failed");
      }

      toast.success("✅ KYC resubmitted successfully");
      router.replace("/partner/dashboard/kyc/pending");
    } catch (err: any) {
      console.error("KYC resubmit error:", err);
      toast.error(err?.message || "Failed to resubmit KYC");
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
        <h2 className="text-2xl font-bold mb-2 text-red-600">❌ KYC Rejected</h2>

        {rejectionReason && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            <b>Reason:</b> {rejectionReason}
          </div>
        )}

        <form onSubmit={handleResubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Business Name *</label>
            <input
              className="border rounded p-2 w-full"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Phone *</label>
            <input
              className="border rounded p-2 w-full"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">
              Aadhaar (Last 4 digits) *
            </label>
            <input
              className="border rounded p-2 w-full"
              value={aadhaar}
              onChange={(e) => setAadhaar(e.target.value)}
              maxLength={4}
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">
              GST Number (optional)
            </label>
            <input
              className="border rounded p-2 w-full"
              value={gst}
              onChange={(e) => setGst(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">
              New Aadhaar File (image/PDF) *
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">
              New GST File (optional)
            </label>
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
              className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Resubmit KYC"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
