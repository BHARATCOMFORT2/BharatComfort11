"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function PartnerKYCPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("loading");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Store selected files & uploaded storagePaths
  const [docs, setDocs] = useState<any>({
    aadhaar: null,
    pan: null,
    gst: null,
  });

  // When user logs in → fetch KYC status
  useEffect(() => {
    auth.onAuthStateChanged(async (user) => {
      if (!user) return router.push("/auth/login");

      const t = await user.getIdToken(true);
      setToken(t);

      // Fetch KYC status
      const res = await fetch("/api/partners/kyc/status", {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();

      if (!data.ok) {
        setStatus("not_created");
        setLoading(false);
        return;
      }

      setStatus(data.status || "pending");
      if (data.status === "rejected") setReason(data.partner?.reason || "");

      // If approved → KYC done
      if (data.status === "approved") {
        setLoading(false);
      }

      // If kyc_pending → show waiting screen
      if (data.status === "kyc_pending") {
        setLoading(false);
      } else {
        setLoading(false);
      }
    });
  }, [router]);

  // ======================
  // FILE → UPLOAD URL → STORAGE UPLOAD
  // ======================
  const uploadDocument = async (file: File, field: string) => {
    if (!token) return alert("Auth error");

    setUploading(true);

    // 1) Get signed upload URL
    const res = await fetch("/api/partners/kyc/upload-url", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      setUploading(false);
      return alert("Failed to get upload URL");
    }

    const { uploadUrl, storagePath } = data;

    // 2) Upload file directly to Firebase Storage
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!uploadRes.ok) {
      setUploading(false);
      return alert("Upload failed");
    }

    // 3) Save reference
    setDocs((prev: any) => ({
      ...prev,
      [field]: {
        filename: file.name,
        storagePath,
        contentType: file.type,
      },
    }));

    setUploading(false);
  };

  // ======================
  // SUBMIT KYC FORM
  // ======================
  const handleSubmitKYC = async () => {
    if (!docs.aadhaar && !docs.pan && !docs.gst) {
      return alert("Please upload at least one document.");
    }

    setUploading(true);

    const documents: any[] = [];
    if (docs.aadhaar) documents.push(docs.aadhaar);
    if (docs.pan) documents.push(docs.pan);
    if (docs.gst) documents.push(docs.gst);

    const res = await fetch("/api/partners/kyc/submit", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idType: "MULTI-DOCS",
        idNumberMasked: "N/A",
        documents,
      }),
    });

    const data = await res.json();
    setUploading(false);

    if (data.ok) {
      alert("KYC submitted successfully!");
      router.refresh();
    } else {
      alert("KYC submission failed: " + data.error);
    }
  };

  // ======================
  // UI BASED ON STATUS
  // ======================

  if (loading) {
    return (
      <DashboardLayout title="KYC Verification" profile={{ role: "partner" }}>
        <div className="text-center p-10">Loading...</div>
      </DashboardLayout>
    );
  }

  if (status === "kyc_pending") {
    return (
      <DashboardLayout title="KYC Verification" profile={{ role: "partner" }}>
        <div className="bg-yellow-50 p-6 rounded-xl text-center max-w-lg mx-auto">
          <h2 className="text-lg font-semibold">KYC Submitted</h2>
          <p className="text-gray-700 mt-2">
            Your documents are under verification. Please wait.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (status === "approved") {
    return (
      <DashboardLayout title="KYC Verification" profile={{ role: "partner" }}>
        <div className="bg-green-50 p-6 rounded-xl text-center max-w-lg mx-auto">
          <h2 className="text-lg font-semibold text-green-600">
            ✅ KYC Approved
          </h2>
          <p>You can now access your full partner dashboard.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (status === "rejected") {
    return (
      <DashboardLayout title="KYC Verification" profile={{ role: "partner" }}>
        <div className="bg-red-50 p-6 rounded-xl text-center max-w-lg mx-auto">
          <h2 className="text-lg font-semibold text-red-600">❌ KYC Rejected</h2>
          <p className="text-gray-700 mt-2">{reason}</p>
          <p className="mt-4">Please upload correct documents again.</p>
        </div>
      </DashboardLayout>
    );
  }

  // ======================
  // MAIN FORM UI (pending / not_created)
  // ======================
  return (
    <DashboardLayout title="KYC Verification" profile={{ role: "partner" }}>
      <div className="bg-white p-6 rounded-xl shadow max-w-2xl mx-auto">
        <h2 className="text-xl font-bold mb-4">Submit Your KYC Documents</h2>

        <p className="text-gray-600 mb-4">
          Please upload at least one document.
        </p>

        <div className="space-y-4">
          {["aadhaar", "pan", "gst"].map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium capitalize">
                {field} Document
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                disabled={uploading}
                onChange={(e) => uploadDocument(e.target.files![0], field)}
                className="mt-1"
              />

              {docs[field] && (
                <p className="text-green-600 text-sm mt-1">
                  ✔ Uploaded: {docs[field].filename}
                </p>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmitKYC}
          disabled={uploading}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {uploading ? "Uploading..." : "Submit KYC"}
        </button>
      </div>
    </DashboardLayout>
  );
}
