"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function PartnerKYCPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [kyc, setKyc] = useState({
    panNumber: "",
    gstNumber: "",
    businessProofUrl: "",
    gstCertUrl: "",
    idFrontUrl: "",
    idBackUrl: "",
  });

  /* -------------------- Auth -------------------- */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        router.push("/auth/login");
        return;
      }
      setUser(currentUser);

      const ref = doc(db, "partners", currentUser.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        setKyc((prev) => ({
          ...prev,
          ...(data.kyc?.documents || {}),
          panNumber: data.kyc?.panNumber || "",
          gstNumber: data.kyc?.gstNumber || "",
        }));
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  /* -------------------- File Upload -------------------- */
  const handleFileUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setKyc((prev) => ({ ...prev, [field]: data.url }));
      } else alert("File upload failed");
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed. Try again.");
    }
  };

  /* -------------------- Submit KYC -------------------- */
  const handleSubmit = async () => {
    if (!kyc.panNumber || !kyc.idFrontUrl) {
      alert("Please upload required KYC documents");
      return;
    }

    setSubmitting(true);
    try {
      const ref = doc(db, "partners", user.uid);
      await updateDoc(ref, {
        kyc: {
          status: "submitted",
          panNumber: kyc.panNumber,
          gstNumber: kyc.gstNumber,
          documents: {
            businessProofUrl: kyc.businessProofUrl,
            gstCertUrl: kyc.gstCertUrl,
            idFrontUrl: kyc.idFrontUrl,
            idBackUrl: kyc.idBackUrl,
          },
          submittedAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      });
      alert("✅ KYC submitted successfully! It will be reviewed shortly.");
      router.push("/partner/dashboard");
    } catch (err) {
      console.error("KYC submit error:", err);
      alert("Failed to submit KYC. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-center py-12">Loading KYC...</p>;

  const kycStatus = profile?.kyc?.status || "not_submitted";

  return (
    <DashboardLayout
      title="KYC Verification"
      profile={{
        name: profile?.businessName || profile?.name || "Partner",
        role: "partner",
        profilePic: profile?.profilePic,
      }}
    >
      <div className="bg-white p-6 rounded-2xl shadow max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold mb-2">Partner KYC Verification</h2>
        <p className="text-gray-600 mb-6">
          Please upload your official documents. Admin will verify within 24-48 hours.
        </p>

        {/* KYC Status */}
        <div
          className={`mb-6 p-3 rounded-lg text-sm font-medium ${
            kycStatus === "approved"
              ? "bg-green-100 text-green-700"
              : kycStatus === "rejected"
              ? "bg-red-100 text-red-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          Current Status: {kycStatus.toUpperCase()}
        </div>

        {/* PAN Number */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            PAN Number
          </label>
          <input
            type="text"
            value={kyc.panNumber}
            onChange={(e) => setKyc({ ...kyc, panNumber: e.target.value.toUpperCase() })}
            className="border rounded-lg w-full p-2"
            placeholder="ABCDE1234F"
          />
        </div>

        {/* GST Number */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            GST Number (Optional)
          </label>
          <input
            type="text"
            value={kyc.gstNumber}
            onChange={(e) => setKyc({ ...kyc, gstNumber: e.target.value.toUpperCase() })}
            className="border rounded-lg w-full p-2"
            placeholder="22AAAAA0000A1Z5"
          />
        </div>

        {/* Document Uploads */}
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          {[
            { label: "ID Proof (Front)", field: "idFrontUrl" },
            { label: "ID Proof (Back)", field: "idBackUrl" },
            { label: "Business Proof (License, Rent, etc.)", field: "businessProofUrl" },
            { label: "GST Certificate (if applicable)", field: "gstCertUrl" },
          ].map(({ label, field }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => handleFileUpload(e, field)}
                className="border p-2 rounded-lg w-full"
              />
              {kyc[field] && (
                <a
                  href={kyc[field]}
                  target="_blank"
                  className="text-blue-600 text-sm underline mt-1 inline-block"
                >
                  View Uploaded
                </a>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-3">
          <button
            onClick={() => router.push("/partner/dashboard")}
            className="px-4 py-2 bg-gray-200 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit KYC"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
