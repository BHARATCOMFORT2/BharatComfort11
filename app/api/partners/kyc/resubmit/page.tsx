"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { auth } from "@/lib/firebase-client";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function KYCResubmitPage() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [partner, setPartner] = useState<any>(null);
  const router = useRouter();

  const [files, setFiles] = useState<Record<string, File | null>>({
    aadharFront: null,
    aadharBack: null,
    pan: null,
    selfie: null,
    gst: null,
    bankProof: null,
  });

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    onAuthStateChanged(auth, async (u) => {
      if (!u) return router.push("/auth/login");
      setUser(u);
      const t = await u.getIdToken();
      setToken(t);

      // fetch partner profile
      const res = await fetch("/api/partners/profile", { headers: { "Content-Type": "application/json" } });
      const data = await res.json();
      setPartner(data.partner || null);
    });
  }, [router]);

  const handleFile = (e: any, key: string) => {
    const f = e.target.files?.[0] ?? null;
    setFiles((p) => ({ ...p, [key]: f }));
  };

  const uploadOne = async (file: File, docType: string) => {
    const form = new FormData();
    form.append("partnerId", user.uid);
    form.append("token", token!);
    form.append("docType", docType);
    form.append("file", file);

    const res = await fetch("/api/partners/kyc/upload", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || "Upload failed");
    return { docType, storagePath: json.storagePath };
  };

  const handleSubmit = async () => {
    try {
      if (!user || !token) { toast.error("Not signed in"); return; }

      // require at least one new file or allow reusing existing docs
      const toUpload: any[] = [];
      for (const key of Object.keys(files)) {
        const f = files[key];
        if (f) toUpload.push({ key, file: f });
      }

      setUploading(true);
      const uploaded: any[] = [];

      // upload new files
      for (const item of toUpload) {
        const up = await uploadOne(item.file, item.key);
        uploaded.push(up);
      }

      // build documents list — include existing partner docs (if present) + uploaded
      const existingDocs = partner?.kyc?.documents ?? [];
      const docsMap: Record<string, any> = {};
      existingDocs.forEach((d: any) => (docsMap[d.docType] = d));

      for (const u of uploaded) docsMap[u.docType] = u;

      const finalDocs = Object.values(docsMap);

      if (finalDocs.length === 0) {
        toast.error("Please upload at least one document");
        setUploading(false);
        return;
      }

      // submit metadata
      const submitRes = await fetch("/api/partners/kyc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          idType: partner?.idType ?? "aadhaar_pan",
          idNumberMasked: partner?.idNumberMasked ?? "****",
          documents: finalDocs,
        }),
      });

      const out = await submitRes.json();
      if (!submitRes.ok) throw new Error(out.error || "Submit failed");

      toast.success("KYC resubmitted. Admin will review.");
      router.push("/partner/dashboard/kyc/pending");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error during KYC resubmit");
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout title="KYC Re-submit">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">Re-submit KYC Documents</h2>

        {partner?.kycStatus === "kyc_rejected" && (
          <div className="mb-4 p-3 bg-red-50 text-sm rounded">
            Previous submission was rejected. Please upload corrected documents and resubmit.
            <div className="mt-2 text-gray-600">{partner?.kycRemarks}</div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {[
            { k: "aadharFront", l: "Aadhaar Front" },
            { k: "aadharBack", l: "Aadhaar Back" },
            { k: "pan", l: "PAN Card" },
            { k: "selfie", l: "Selfie with ID" },
            { k: "gst", l: "GST (optional)" },
            { k: "bankProof", l: "Bank Proof" },
          ].map((it) => (
            <div key={it.k}>
              <label className="font-medium">{it.l}</label>
              <input className="mt-2" type="file" accept="image/*,application/pdf" onChange={(e) => handleFile(e, it.k)} />
              <div className="text-sm text-gray-500 mt-1">
                {partner?.kyc?.documents?.find((d:any)=>d.docType===it.k)?.storagePath ? (
                  <a className="text-blue-600" target="_blank" rel="noreferrer" href={
                    partner!.kyc!.documents.find((d:any)=>d.docType===it.k)!.storagePath.replace(/^gs:\/\//,"https://storage.googleapis.com/")
                  }>View current</a>
                ) : "No existing file"}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={handleSubmit} disabled={uploading}>
            {uploading ? "Submitting..." : "Resubmit KYC"}
          </button>
          <button className="px-4 py-2 border rounded" onClick={() => router.push("/partner/dashboard")}>Cancel</button>
        </div>
      </div>
    </DashboardLayout>
  );
}
