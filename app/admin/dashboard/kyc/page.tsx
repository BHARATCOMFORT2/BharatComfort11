"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";

/* =========================================================
   🔹 Modal Component (Typed)
========================================================= */
type ModalProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

function Modal({ isOpen, title, onClose, children }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-lg w-[95%] max-w-2xl relative">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <button
          onClick={onClose}
          className="absolute right-4 top-3 text-gray-600 hover:text-gray-900"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}

/* =========================================================
   🔹 Data Types
========================================================= */
interface PartnerData {
  id: string;
  name?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  kyc?: {
    panNumber?: string;
    gstNumber?: string;
    status?: "submitted" | "pending" | "approved" | "rejected";
    submittedAt?: any;
    approvedAt?: any;
    rejectedAt?: any;
    rejectionReason?: string;
    documents?: Record<string, string>;
  };
}

/* =========================================================
   🔹 Admin KYC Management Page
========================================================= */
export default function AdminKYCPage() {
  const { firebaseUser, profile, loading } = useAuth();
  const [kycList, setKycList] = useState<PartnerData[]>([]);
  const [selected, setSelected] = useState<PartnerData | null>(null);

  /* ---------------------------------------------------------
     📡 Fetch Pending KYC
  --------------------------------------------------------- */
  useEffect(() => {
    if (!firebaseUser) return;

    const q = query(
      collection(db, "partners"),
      where("kyc.status", "in", ["submitted", "pending"]),
      orderBy("kyc.submittedAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => {
        const data = d.data() as PartnerData;
        return { ...data, id: data.id || d.id } as PartnerData; // ✅ safe id assignment
      });
      setKycList(docs);
    });

    return () => unsub();
  }, [firebaseUser]);

  /* ---------------------------------------------------------
     ✅ Approve / ❌ Reject
  --------------------------------------------------------- */
  const handleApprove = async (partnerId: string) => {
    if (!confirm("Approve this KYC?")) return;
    await updateDoc(doc(db, "partners", partnerId), {
      "kyc.status": "approved",
      "kyc.approvedAt": serverTimestamp(),
    });
    alert("✅ KYC approved successfully!");
    setSelected(null);
  };

  const handleReject = async (partnerId: string) => {
    const reason = prompt("Enter reason for rejection:");
    if (!reason) return;
    await updateDoc(doc(db, "partners", partnerId), {
      "kyc.status": "rejected",
      "kyc.rejectionReason": reason,
      "kyc.rejectedAt": serverTimestamp(),
    });
    alert("❌ KYC rejected.");
    setSelected(null);
  };

  /* ---------------------------------------------------------
     🧭 Render
  --------------------------------------------------------- */
  if (loading) return <p className="text-center py-12">Loading...</p>;

  if (profile?.role !== "admin") {
    return <p className="text-center py-12 text-red-500">Access denied.</p>;
  }

  return (
    <DashboardLayout title="KYC Management" profile={profile}>
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">Pending KYC Submissions</h2>

        {kycList.length === 0 && (
          <p className="text-gray-500 text-sm">No pending submissions.</p>
        )}

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-3 border-b">Partner</th>
                <th className="p-3 border-b">Email</th>
                <th className="p-3 border-b">PAN</th>
                <th className="p-3 border-b">GST</th>
                <th className="p-3 border-b">Status</th>
                <th className="p-3 border-b text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {kycList.map((p) => (
                <tr
                  key={p.id}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelected(p)}
                >
                  <td className="p-3">{p.businessName || p.name}</td>
                  <td className="p-3">{p.email}</td>
                  <td className="p-3">{p.kyc?.panNumber || "-"}</td>
                  <td className="p-3">{p.kyc?.gstNumber || "-"}</td>
                  <td
                    className={`p-3 ${
                      p.kyc?.status === "submitted"
                        ? "text-yellow-600"
                        : "text-gray-600"
                    }`}
                  >
                    {p.kyc?.status}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(p);
                      }}
                      className="text-blue-600 underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🔍 KYC Modal */}
      <Modal
        isOpen={!!selected}
        title={`KYC Details - ${selected?.businessName || selected?.name}`}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="space-y-3">
            <p>
              <strong>Email:</strong> {selected.email}
            </p>
            <p>
              <strong>Phone:</strong> {selected.phone || "-"}
            </p>
            <p>
              <strong>PAN:</strong> {selected.kyc?.panNumber || "-"}
            </p>
            <p>
              <strong>GST:</strong> {selected.kyc?.gstNumber || "-"}
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              {Object.entries(selected.kyc?.documents || {}).map(
                ([key, url]) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    className="text-blue-600 underline"
                  >
                    View {key.replace("Url", "").replace(/([A-Z])/g, " $1")}
                  </a>
                )
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => handleReject(selected.id)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg"
              >
                Reject
              </button>
              <button
                onClick={() => handleApprove(selected.id)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg"
              >
                Approve
              </button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
