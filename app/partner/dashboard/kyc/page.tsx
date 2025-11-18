"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
};

if (!globalThis.firebaseApp) {
  globalThis.firebaseApp = initializeApp(firebaseConfig);
}

const auth = getAuth(globalThis.firebaseApp);

export default function PartnerKYCPage() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  const [idNumber, setIdNumber] = useState("");

  // DOCS
  const [docs, setDocs] = useState({
    aadharFront: null as File | null,
    aadharBack: null as File | null,
    pan: null as File | null,
    selfie: null as File | null,
    gst: null as File | null,
    bankProof: null as File | null,
  });

  const [uploading, setUploading] = useState(false);

  // Listen for auth user
  useEffect(() => {
    onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      setUser(u);
      const t = await u.getIdToken();
      setToken(t);
    });
  }, []);

  const handleFileChange = (e: any, key: string) => {
    const f = e.target.files[0];
    setDocs((prev) => ({ ...prev, [key]: f }));
  };

  const maskId = (val: string) => {
    if (!val) return "****";
    if (val.length <= 4) return "****";
    return "****" + val.slice(-4);
  };

  // Upload file to backend
  const uploadFile = async (file: File, docType: string) => {
    const form = new FormData();
    form.append("partnerId", user.uid);
    form.append("token", token!);
    form.append("docType", docType);
    form.append("file", file);

    const res = await fetch("/api/partners/kyc/upload", {
      method: "POST",
      body: form,
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Upload failed");
    }

    return {
      docType,
      storagePath: data.storagePath,
    };
  };

  const handleSubmit = async () => {
    try {
      if (!user || !token) {
        toast.error("You must be logged in");
        return;
      }

      setUploading(true);

      // Upload each file
      const uploadedDocs: any[] = [];

      for (const key of Object.keys(docs)) {
        const file = docs[key as keyof typeof docs];
        if (!file) {
          toast.error(`Missing file: ${key}`);
          setUploading(false);
          return;
        }

        const uploaded = await uploadFile(file, key);
        uploadedDocs.push(uploaded);
      }

      // Submit KYC metadata
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

      if (!out.success) {
        throw new Error(out.error || "Submission failed");
      }

      toast.success("KYC submitted successfully!");

      setTimeout(() => {
        router.push("/partner/dashboard");
      }, 1000);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "KYC submission failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow-md">
        <h1 className="text-2xl font-bold mb-4">Partner KYC Verification</h1>

        <p className="text-gray-600 mb-4">
          Upload all required documents for verification (24–48 hrs).
        </p>

        {/* ID Number */}
        <div className="mb-4">
          <label className="font-medium">Aadhaar/PAN Number</label>
          <input
            type="text"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
            placeholder="Enter your ID number"
          />
        </div>

        {/* File upload fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { key: "aadharFront", label: "Aadhaar Front" },
            { key: "aadharBack", label: "Aadhaar Back" },
            { key: "pan", label: "PAN Card" },
            { key: "selfie", label: "Selfie with ID" },
            { key: "gst", label: "GST Certificate (optional)" },
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

              {/* Preview */}
              {docs[item.key as keyof typeof docs] &&
                docs[item.key as keyof typeof docs]!.type.startsWith("image") && (
                  <img
                    src={URL.createObjectURL(
                      docs[item.key as keyof typeof docs]!
                    )}
                    className="mt-2 w-full rounded-lg shadow"
                  />
                )}
            </div>
          ))}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          className="mt-6 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Submit KYC"}
        </button>
      </div>
    </DashboardLayout>
  );
}
