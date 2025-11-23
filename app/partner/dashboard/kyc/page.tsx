"use client";

import React, { useEffect, useState } from "react";
import { auth } from "@/lib/firebase-client";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

export default function PartnerKYCPage() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [idNumber, setIdNumber] = useState("");
  const [docs, setDocs] = useState({
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
      if (!u) {
        router.push("/auth/login");
        return;
      }

      setUser(u);
      const t = await u.getIdToken();
      setToken(t);

      const res = await fetch("/api/partners/profile", {
        method: "GET",
        credentials: "include",
      });

      const json = await res.json();
      setProfile(json.partner || null);
      setLoading(false);
    });
  }, [router]);

  const handleFileChange = (e, key) => {
    const file = e.target.files[0];
    setDocs((prev) => ({ ...prev, [key]: file }));
  };

  const maskId = (val) => {
    if (!val) return "****";
    if (val.length <= 4) return "****";
    return "****" + val.slice(-4);
  };

  const uploadFile = async (file, docType) => {
    const form = new FormData();
    form.append("partnerId", user.uid);
    form.append("token", token);
    form.append("docType", docType);
    form.append("file", file);

    const res = await fetch("/api/partners/kyc/upload", {
      method: "POST",
      body: form,
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Upload failed");

    return { docType, storagePath: data.storagePath };
  };

  const handleSubmit = async () => {
    try {
      if (!user || !token) {
        toast.error("You must be logged in");
        return;
      }

      if (!idNumber) {
        toast.error("Please enter Aadhaar/PAN number");
        return;
      }

      for (const key of Object.keys(docs)) {
        if (!docs[key] && key !== "gst") {
          toast.error(`Missing file: ${key}`);
          return;
        }
      }

      setUploading(true);

      const uploadedDocs = [];

      for (const key of Object.keys(docs)) {
        const file = docs[key];
        if (!file) continue;

        const uploaded = await uploadFile(file, key);
        uploadedDocs.push(uploaded);
      }

      const submitRes = await fetch("/api/partners/kyc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          idType: "aadhaar_pan",
          idNumberMasked: maskId(idNumber),
          documents: uploadedDocs,
        }),
      });

      const out = await submitRes.json();
      if (!out.success) throw new Error(out.error || "Submission failed");

      toast.success("KYC submitted successfully!");
      router.push("/partner/dashboard/kyc/pending");
    } catch (err) {
      toast.error(err.message || "Submission failed");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <p className="text-center py-10">Loading...</p>;

  const kycStatus = profile?.kycStatus || "NOT_STARTED";

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow-md mt-6">
      <h1 className="text-2xl font-bold mb-4">Partner KYC Verification</h1>

      <div
        className={`mb-6 p-3 rounded-lg text-sm font-medium ${
          kycStatus === "APPROVED"
            ? "bg-green-100 text-green-700"
            : kycStatus === "REJECTED"
            ? "bg-red-100 text-red-700"
            : "bg-yellow-100 text-yellow-700"
        }`}
      >
        Current Status: {kycStatus.replace(/_/g, " ")}
      </div>

      <div className="mb-4">
        <label className="font-medium">Aadhaar/PAN Number</label>
        <input
          type="text"
          value={idNumber}
          onChange={(e) => setIdNumber(e.target.value)}
          className="mt-1 w-full border rounded px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { key: "aadharFront", label: "Aadhaar Front" },
          { key: "aadharBack", label: "Aadhaar Back" },
          { key: "pan", label: "PAN Card" },
          { key: "selfie", label: "Selfie with ID" },
          { key: "gst", label: "GST Certificate (Optional)" },
          { key: "bankProof", label: "Bank Proof" },
        ].map((item) => (
          <div key={item.key}>
            <label className="font-medium">{item.label}</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="mt-2"
              onChange={(e) => handleFileChange(e, item.key)}
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        className="mt-6 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
        disabled={uploading}
      >
        {uploading ? "Submitting..." : "Submit KYC"}
      </button>
    </div>
  );
}
