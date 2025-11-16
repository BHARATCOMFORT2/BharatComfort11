"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { auth, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";

export default function PartnerKYCPage() {
  const [idType, setIdType] = useState("Aadhaar");
  const [idNumber, setIdNumber] = useState("");
  const [files, setFiles] = useState({
    idFront: null,
    idBack: null,
    selfie: null,
    business: null,
  });

  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleFile = (e, key) => {
    const file = e.target.files[0];
    setFiles((prev) => ({ ...prev, [key]: file }));
  };

  const maskId = (val: string) => {
    if (!val) return null;
    const s = val.trim();
    if (s.length <= 4) return "****";
    return "****" + s.slice(-4);
  };

  const uploadToStorage = async (uid: string, file: File, folder: string) => {
    const storageRef = ref(storage, `kyc/${uid}/${folder}/${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return { name: folder, url, storagePath: `kyc/${uid}/${folder}/${file.name}` };
  };

  const handleSubmit = async () => {
    try {
      setUploading(true);
      setMessage(null);

      const user = auth.currentUser;
      if (!user) throw new Error("You must be signed in to submit KYC");

      const uid = user.uid;

      // Upload files
      const docs: any[] = [];
      for (const key of ["idFront", "idBack", "selfie", "business"]) {
        const file = (files as any)[key];
        if (file) {
          const uploaded = await uploadToStorage(uid, file, key);
          docs.push(uploaded);
        }
      }

      if (docs.length === 0) throw new Error("Please upload at least one document");

      const token = await user.getIdToken();

      const body = {
        idType,
        idNumberMasked: maskId(idNumber),
        documents: docs,
      };

      const res = await fetch("/api/partners/kyc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Submission failed");

      setMessage("KYC submitted successfully. Admin will review within 24–48 hours.");

      setTimeout(() => router.push("/partner/dashboard"), 1500);
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message || "Error submitting KYC");
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-semibold mb-4">Partner KYC Verification</h1>

        <p className="text-gray-600 mb-6">
          Upload your official documents. Verification takes 24–48 hours.
        </p>

        <div className="grid grid-cols-1 gap-5">

          {/* ID Type */}
          <div>
            <label className="font-medium">ID Type</label>
            <select
              value={idType}
              onChange={(e) => setIdType(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
            >
              <option>Aadhaar</option>
              <option>PAN</option>
              <option>Passport</option>
              <option>GST</option>
            </select>
          </div>

          {/* ID Number */}
          <div>
            <label className="font-medium">ID Number (will be masked)</label>
            <input
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </div>

          {/* File Inputs */}
          <div>
            <label className="font-medium">ID Front</label>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFile(e, "idFront")} />
          </div>

          <div>
            <label className="font-medium">ID Back (optional)</label>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFile(e, "idBack")} />
          </div>

          <div>
            <label className="font-medium">Selfie with ID</label>
            <input type="file" accept="image/*" onChange={(e) => handleFile(e, "selfie")} />
          </div>

          <div>
            <label className="font-medium">Business Proof (GST/Shop Act)</label>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFile(e, "business")} />
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {uploading ? "Submitting..." : "Submit KYC"}
            </button>

            <button
              onClick={() => router.push("/partner/dashboard")}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
          </div>

          {message && (
            <div className="mt-3 text-sm font-medium text-gray-700">{message}</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
