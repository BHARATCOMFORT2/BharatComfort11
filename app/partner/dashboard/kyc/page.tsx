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

  const [kycStatus, setKycStatus] = useState<"NOT_STARTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED">(
    "NOT_STARTED"
  );

  // Load user & profile
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

      // Fetch partner status
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

      // If APPROVED → move back to dashboard
      if (status === "APPROVED") {
        router.push("/partner/dashboard");
      }
    });

    return () => {
      unsub();
      mounted = false;
    };
  }, [router]);

  // Upload a single file
  const uploadFile = async (doc: UploadDoc, index: number) => {
    if (!doc.file || !token) return;

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

  const handleSubmit = async () => {
    if (!token) return;

    if (!idType || !idMasked) {
      return alert("Enter ID type and masked ID");
    }

    // Ensure all docs uploaded
    for (const doc of uploadedDocs) {
      if (!doc.storagePath) {
        return alert("Upload all required documents before submitting.");
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

    alert("KYC submitted! Await admin approval.");
    router.push("/partner/dashboard");
  };

  if (loading) return <p className="text-center py-10">Loading KYC…</p>;

  // ----------------------------------------
  // STATUS HANDLING SCREENS
  // ----------------------------------------

  if (kycStatus === "UNDER_REVIEW") {
    return (
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-3">KYC Submitted</h1>
        <p className="text-gray-700 mb-4">
          Your KYC is under review. Once approved, you will get access to all dashboard features.
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

  // ----------------------------------------
  // MAIN FORM
  // ----------------------------------------

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow">
      <h1 className="text-2xl font-bold mb-4">Partner KYC</h1>
      <p className="text-gray-700 mb-6">Submit your KYC documents for verification.</p>

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

      <h2 className="text-lg font-semibold mb-4">Upload Documents</h2>

      {uploadedDocs.map((doc, index) => (
        <div key={doc.docType} className="mb-4 p-4 border rounded-lg">
          <p className="font-medium mb-2">Document: {doc.docType}</p>

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
            <p className="text-green-700 text-sm">Uploaded: {doc.storagePath}</p>
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
