"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function KYCResubmitPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [latestKyc, setLatestKyc] = useState<any>(null);

  const [docs, setDocs] = useState<Record<string, File | null>>({
    aadhar_front: null,
    aadhar_back: null,
    pan_card: null,
    selfie: null,
    gst: null,
    bank_proof: null,
  });

  const [uploading, setUploading] = useState(false);

  // Convert gs:// to public https link
  const publicURL = (gs: string) => {
    return gs.replace(
      /^gs:\/\/([^/]+)\//,
      "https://storage.googleapis.com/$1/"
    );
  };

  useEffect(() => {
    onAuthStateChanged(auth, async (u) => {
      if (!u) return router.push("/auth/login");

      setUser(u);
      const t = await u.getIdToken();
      setToken(t);

      // Load partner profile
      const res = await fetch("/api/partners/profile", {
        credentials: "include"
      });

      const data = await res.json();

      if (!data.ok) {
        toast.error("Unable to load profile");
        return;
      }

      setProfile(data.partner || null);

      // Load latest KYC
      setLatestKyc(data.latestKyc || null);

      // If KYC approved → redirect away
      if (data.kycStatus === "APPROVED") {
        router.push("/partner/dashboard");
      }
    });
  }, [router]);

  const handleFile = (e: any, key: string) => {
    const file = e.target.files?.[0] || null;
    setDocs((p) => ({ ...p, [key]: file }));
  };

  const uploadOne = async (file: File, docType: string) => {
    const form = new FormData();
    form.append("partnerId", user.uid);
    form.append("token", token!);
    form.append("docType", docType);
    form.append("file", file);

    const res = await fetch("/api/partners/kyc/upload", {
      method: "POST",
      body: form,
    });

    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || "Upload failed");

    return {
      docType,
      storagePath: json.storagePath,
    };
  };

  const handleSubmit = async () => {
    if (!user || !token) {
      toast.error("Not logged in");
      return;
    }

    setUploading(true);

    try {
      const uploadedDocs: any[] = [];

      // Upload only changed files
      for (const docType of Object.keys(docs)) {
        if (docs[docType]) {
          const up = await uploadOne(docs[docType]!, docType);
          uploadedDocs.push(up);
        }
      }

      // Merge with existing KYC document’s docs
      const existingDocs = latestKyc?.documents || [];
      const map: Record<string, any> = {};

      existingDocs.forEach((d: any) => {
        map[d.docType] = d;
      });

      uploadedDocs.forEach((d) => {
        map[d.docType] = d;
      });

      const finalDocuments = Object.values(map);

      if (finalDocuments.length === 0) {
        toast.error("Please upload at least one document");
        setUploading(false);
        return;
      }

      // Submit KYC again
      const res = await fetch("/api/partners/kyc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          token,
          idType: latestKyc?.idType || "aadhaar/pan",
          idNumberMasked: latestKyc?.idNumberMasked || "****",
          documents: finalDocuments,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Submit failed");
      }

      toast.success("KYC re-submitted successfully");
      router.push("/partner/dashboard/kyc/pending");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    } finally {
      setUploading(false);
    }
  };

  if (!profile) {
    return (
      <DashboardLayout title="KYC Resubmit">
        <p className="text-center py-10">Loading…</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Re-submit KYC">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl">
        <h2 className="text-2xl font-semibold mb-4">Re-submit Updated KYC Documents</h2>

        {profile.kycStatus === "REJECTED" && (
          <div className="mb-4 p-3 bg-red-50 rounded text-sm">
            Your previous KYC was rejected. Please correct the documents and re-submit.
            <div className="text-gray-600 mt-2">
              {latestKyc?.remarks || "No remarks provided."}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {[
            ["aadhar_front", "Aadhaar Front"],
            ["aadhar_back", "Aadhaar Back"],
            ["pan_card", "PAN Card"],
            ["selfie", "Selfie with ID"],
            ["gst", "GST (optional)"],
            ["bank_proof", "Bank Proof"],
          ].map(([key, label]) => {
            const existing = latestKyc?.documents?.find((d: any) => d.docType === key);

            return (
              <div key={key}>
                <label className="block font-medium">{label}</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="mt-2"
                  onChange={(e) => handleFile(e, key)}
                />
                {existing?.storagePath && (
                  <a
                    href={publicURL(existing.storagePath)}
                    target="_blank"
                    className="text-blue-600 text-sm mt-1 block"
                  >
                    View existing
                  </a>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            className="px-4 py-2 bg-green-600 text-white rounded"
            onClick={handleSubmit}
            disabled={uploading}
          >
            {uploading ? "Submitting…" : "Re-submit KYC"}
          </button>
          <button
            className="px-4 py-2 border rounded"
            onClick={() => router.push("/partner/dashboard")}
          >
            Cancel
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
