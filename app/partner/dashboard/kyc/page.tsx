"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function PartnerKYCPage() {
  const router = useRouter();
  const [kyc, setKyc] = useState<any>(null);
  const [files, setFiles] = useState({ aadhaar: "", pan: "", gst: "" });
  const [uploading, setUploading] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) return router.push("/auth/login");
      const t = await user.getIdToken();
      setToken(t);

      const ref = doc(db, "partners", user.uid);
      const unsubPartner = onSnapshot(ref, (snap) => {
        if (snap.exists()) setKyc(snap.data().kyc || null);
      });

      return () => unsubPartner();
    });
    return () => unsub();
  }, [router]);

  const handleUpload = async (e: any, field: string) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    const res = await fetch("/api/uploads", { method: "POST", body: formData });
    const data = await res.json();
    setUploading(false);

    if (data.url) {
      setFiles((prev) => ({ ...prev, [field]: data.url }));
    } else alert("Upload failed");
  };

  const handleSubmit = async () => {
    if (!token) return alert("Auth error");
    const res = await fetch("/api/kyc/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        aadhaarUrl: files.aadhaar,
        panUrl: files.pan,
        gstUrl: files.gst,
      }),
    });
    const data = await res.json();
    if (data.success) alert("✅ KYC submitted successfully!");
    else alert(`❌ ${data.error}`);
  };

  return (
    <DashboardLayout title="KYC Verification" profile={{ role: "partner" }}>
      <div className="bg-white p-6 rounded-2xl shadow max-w-2xl mx-auto">
        <h2 className="text-xl font-bold mb-4">Submit Your KYC Documents</h2>

        {kyc ? (
          <div className="p-4 border rounded-xl bg-gray-50">
            <p>Status: <b className="capitalize">{kyc.status}</b></p>
            {kyc.status === "rejected" && (
              <p className="text-red-600 text-sm mt-1">{kyc.remark}</p>
            )}
            {kyc.status === "approved" && (
              <p className="text-green-600 text-sm mt-1">✅ Verified</p>
            )}
          </div>
        ) : (
          <p className="text-gray-600 mb-4">
            Please upload at least one of the following documents.
          </p>
        )}

        <div className="space-y-3 mt-4">
          {["aadhaar", "pan", "gst"].map((type) => (
            <div key={type}>
              <label className="block text-sm font-medium mb-1 capitalize">
                {type} Card
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => handleUpload(e, type)}
                disabled={uploading}
              />
              {files[type] && (
                <a
                  href={files[type]}
                  target="_blank"
                  className="text-blue-600 text-sm underline"
                >
                  View uploaded
                </a>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={uploading}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Submit KYC
        </button>
      </div>
    </DashboardLayout>
  );
}
