"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

export default function AdminKYCReviewPage() {
  const params = useParams();
  const router = useRouter();
  const partnerUid = params.partnerUid as string;

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [kycData, setKycData] = useState<any>(null);
  const [approving, setApproving] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Load admin token → fetch KYC
  useEffect(() => {
    auth.onAuthStateChanged(async (user) => {
      if (!user) return router.push("/auth/login");

      const t = await user.getIdToken(true);
      setToken(t);

      await fetchKYC(t);
    });
  }, []);

  const fetchKYC = async (t: string) => {
    try {
      const res = await fetch(
        `/api/admin/partners/kyc/get?partnerUid=${partnerUid}`,
        {
          headers: { Authorization: `Bearer ${t}` },
        }
      );

      const data = await res.json();
      if (data.ok) {
        setKycData(data);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Error loading KYC details");
    }
    setLoading(false);
  };

  const approveKYC = async () => {
    setApproving(true);

    try {
      const res = await fetch("/api/admin/partners/approve", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          partnerUid,
          action: "approve",
        }),
      });

      const data = await res.json();
      if (data.ok) {
        alert("KYC approved successfully!");
        router.push("/admin/dashboard/kyc");
      } else {
        alert(data.error);
      }
    } catch {
      alert("Error approving KYC");
    }

    setApproving(false);
  };

  const rejectKYC = async () => {
    if (!rejectReason.trim()) return alert("Please enter a rejection reason.");

    setApproving(true);

    try {
      const res = await fetch("/api/admin/partners/approve", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          partnerUid,
          action: "reject",
          reason: rejectReason,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        alert("KYC rejected!");
        router.push("/admin/dashboard/kyc");
      } else {
        alert(data.error);
      }
    } catch {
      alert("Error rejecting KYC");
    }

    setApproving(false);
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-gray-700">Loading KYC data...</div>
    );
  }

  if (!kycData) {
    return (
      <div className="p-10 text-center text-red-600">KYC not found</div>
    );
  }

  const { partner, kyc } = kycData;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">KYC Review</h1>

      {/* Partner Info */}
      <div className="bg-white p-5 rounded-xl shadow mb-5">
        <h2 className="font-semibold text-lg mb-2">Partner Details</h2>
        <p><b>Name:</b> {partner.displayName}</p>
        <p><b>Business:</b> {partner.businessName}</p>
        <p><b>Email:</b> {partner.email}</p>
        <p><b>Phone:</b> {partner.phone}</p>
        <p className="mt-2"><b>Current Status:</b> {partner.status}</p>
      </div>

      {/* KYC Info */}
      <div className="bg-white p-5 rounded-xl shadow mb-6">
        <h2 className="font-semibold text-lg mb-3">KYC Submission</h2>
        <p><b>ID Type:</b> {kyc.idType}</p>
        <p><b>Masked ID:</b> {kyc.idNumberMasked}</p>
        <p><b>Submitted:</b> {new Date(kyc.submittedAt?._seconds * 1000).toLocaleString()}</p>

        {/* Documents */}
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Uploaded Documents</h3>
          <div className="space-y-3">
            {kyc.documents.map((doc: any, index: number) => (
              <div key={index} className="border p-3 rounded-lg">
                <p className="font-medium">{doc.filename}</p>
                <a
                  href={`https://storage.googleapis.com/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/${doc.storagePath}`}
                  target="_blank"
                  className="text-blue-600 underline text-sm"
                >
                  View Document
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Reject Reason */}
        <div className="mt-5">
          <textarea
            placeholder="Enter rejection reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full border rounded-lg p-2"
            rows={3}
          />
        </div>

        {/* Approve / Reject Buttons */}
        <div className="flex gap-4 mt-5">
          <button
            onClick={approveKYC}
            disabled={approving}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Approve
          </button>

          <button
            onClick={rejectKYC}
            disabled={approving}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
