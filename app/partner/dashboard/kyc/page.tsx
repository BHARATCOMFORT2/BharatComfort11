"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

type UploadDoc = {
  docType: string;
  file: File | null;
  storagePath?: string;
};

export default function PartnerKYCPage() {
  const router = useRouter();

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [idType, setIdType] = useState("");
  const [idMasked, setIdMasked] = useState("");

  const [uploadedDocs, setUploadedDocs] = useState<UploadDoc[]>([
    { docType: "aadhar_front", file: null },
    { docType: "aadhar_back", file: null },
    { docType: "pan_card", file: null },
  ]);

  const [kycStatus, setKycStatus] = useState<
    "NOT_STARTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED"
  >("NOT_STARTED");

  // ---------------------------------------------
  // LOAD USER + CURRENT KYC STATUS
  // ---------------------------------------------
  useEffect(() => {
    let mounted = true;

    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const t = await user.getIdToken(true);
      if (!mounted) return;
      setToken(t);

      // Fetch profile from API
      const res = await fetch("/api/partners/profile", {
        credentials: "include",
      });
      const j = await res.json().catch(() => null);

      if (!j?.ok) {
        setLoading(false);
        return;
      }

      const status =
        (j.kycStatus || j.partner?.kycStatus || "NOT_STARTED")
          .toString()
          .toUpperCase() as any;

      setKycStatus(status);
      setLoading(false);

      // If APPROVED → redirect to dashboard
      if (status === "APPROVED") {
        router.push("/partner/dashboard");
      }
    });

    return () => {
      unsub();
      mounted = false;
    };
  }, [router]);

  // ---------------------------------------------
  // UPLOAD FILE TO BACKEND
  // ---------------------------------------------
  const uploadFile = async (doc: UploadDoc, index: number) => {
    if (!doc.file) return;

    const form = new FormData();
    form.append("file", doc.file);
    form.append("docType", doc.docType);
    form.append("partnerId", auth.currentUser?.uid || "");
    form.append("token", token);

    const res = await fetch("/api/partners/kyc/upload", {
      method: "POST",
      body: form,
    });

    const j = await res.json();
    if (j?.success && j.storagePath) {
      const updated = [...uploadedDocs];
      updated[index].storagePath = j.storagePath;
      setUploadedDocs(updated);
    } else {
      alert(j.error || "Upload failed");
    }
  };

  // ---------------------------------------------
  // FINAL SUBMIT
  // ---------------------------------------------
  const handleSubmit = async () => {
    if (!token) return;

    if (!idType || !idMasked) {
      return alert("Enter ID Type and Masked ID Number");
    }

    // Validate all uploads
    for (const doc of uploadedDocs) {
      if (!doc.storagePath) {
        return alert("Please upload all required documents.");
      }
    }

    setSubmitting(true);

    const res = await fetch("/api/partners/kyc/submit", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        idType,
        idNumberMasked: idMasked,
        documents: uploadedDocs.map((d) => ({
          docType: d.docType,
          storagePath: d.storagePath,
        })),
      }),
    });

    const j = await res.json().catch(() => null);
    setSubmitting(false);

    if (!res.ok || !j?.success) {
      alert(j?.error || "Submit failed");
      return;
    }

    alert("KYC submitted successfully!");
    router.push("/partner/dashboard");
  };

  if (loading) return <p className="text-center py-10">Loading KYC…</p>;

  // ---------------------------------------------
  // KYC STATUS UI
  // ---------------------------------------------

  if (kycStatus === "UNDER_REVIEW") {
    return (
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-3">KYC Submitted</h1>
        <p className="text-gray-700 mb-4">
          Your KYC is under review. You will be notified once it is approved.
        </p>
        <button
          onClick={() => router.push("/partner/dashboard")}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (kycStatus === "APPROVED") {
    router.push("/partner/dashboard");
    return null;
  }

  // ---------------------------------------------
  // KYC FORM PAGE
  // ---------------------------------------------
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow">
      <h1 className="text-2xl font-bold mb-4">Partner KYC</h1>
      <p className="text-gray-700 mb-6">Submit your KYC documents for verification.</p>

      {kycStatus === "REJECTED" && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          Your previous KYC submission was rejected. Please resubmit all documents correctly.
        </div>
      )}

      {/* ID Details */}
      <div className="space-y-4 mb-8">
        <label className="block text-sm">ID Type</label>
        <input
          value={idType}
          onChange={(e) => setIdType(e.target.value)}
          className="border rounded-lg p-2 w-full"
          placeholder="Aadhar / PAN / Voter ID"
        />

        <label className="block text-sm">Masked ID Number</label>
        <input
          value={idMasked}
          onChange={(e) => setIdMasked(e.target.value)}
          className="border rounded-lg p-2 w-full"
          placeholder="XXXX XXXX 1234"
        />
      </div>

      {/* File Upload Section */}
      <h2 className="text-lg font-semibold mb-4">Upload Documents</h2>

      {uploadedDocs.map((doc, index) => (
        <div key={doc.docType} className="mb-4 p-4 border rounded-lg">
          <p className="font-medium mb-2 capitalize">
            {doc.docType.replace("_", " ")}
          </p>

          <input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              const updated = [...uploadedDocs];
              updated[index].file = file;
              setUploadedDocs(updated);

              if (file) uploadFile({ ...doc, file }, index);
            }}
            className="mb-2"
          />

          {doc.storagePath && (
            <p className="text-green-700 text-sm">
              Uploaded: {doc.storagePath}
            </p>
          )}
        </div>
      ))}

      <button
        disabled={submitting}
        onClick={handleSubmit}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg"
      >
        {submitting ? "Submitting…" : "Submit KYC"}
      </button>
    </div>
  );
}
