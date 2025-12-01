"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase-client";
import { doc, getDoc } from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import toast from "react-hot-toast";

/* ---------------------------------------
   TYPES
---------------------------------------- */

type LeadNote = {
  text: string;
  addedBy?: string;
  createdAt?: string;
};

type CallLog = {
  phone?: string;
  outcome?: string;
  note?: string;
  calledBy?: string;
  createdAt?: string;
};

type LeadDetail = {
  id: string;
  name: string;
  businessName?: string;
  address?: string;
  city?: string;

  phone?: string;
  email?: string;
  contactPerson?: string;

  category?: string;
  status?: string;
  followupDate?: string;

  adminNote?: string;
  partnerNotes?: string;

  dueDate?: any;
  lastCalledAt?: any;

  notes?: LeadNote[];
  callLogs?: CallLog[];
};

/* ---------------------------------------
   COMPONENT
---------------------------------------- */

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params?.leadId as string;

  const [loadingUser, setLoadingUser] = useState(true);
  const [token, setToken] = useState<string>("");
  const [staffProfile, setStaffProfile] = useState<{
    name?: string;
    role?: "staff";
  } | null>(null);

  const [loadingLead, setLoadingLead] = useState(true);
  const [lead, setLead] = useState<LeadDetail | null>(null);

  /* ---------------------------------------
     ✅ STAFF AUTH + APPROVAL CHECK
  ---------------------------------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoadingUser(false);
        router.push("/staff/login");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "staff", user.uid));

        if (!snap.exists()) {
          await signOut(auth);
          toast.error("Staff profile not found");
          router.push("/staff/login");
          return;
        }

        const profile = snap.data();

        if (profile.role !== "telecaller") {
          await signOut(auth);
          toast.error("This page is for telecallers only");
          router.push("/staff/login");
          return;
        }

        if (profile.status !== "approved" || profile.isActive !== true) {
          await signOut(auth);
          toast("Your account is not active", { icon: "⏳" });
          router.push("/staff/login");
          return;
        }

        const t = await user.getIdToken();
        setToken(t);

        setStaffProfile({
          name:
            profile.name ||
            user.displayName ||
            user.email?.split("@")[0] ||
            "Telecaller",
          role: "staff",
        });
      } catch (err) {
        console.error("Staff auth error:", err);
        await signOut(auth);
        router.push("/staff/login");
      } finally {
        setLoadingUser(false);
      }
    });

    return () => unsub();
  }, [router]);

  /* ---------------------------------------
     ✅ FETCH SINGLE LEAD (API–5)
  ---------------------------------------- */
  useEffect(() => {
    if (!token || !leadId) return;

    const fetchLead = async () => {
      setLoadingLead(true);
      try {
        const res = await fetch("/api/staff/leads/get-single", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ leadId }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data?.message || "Failed to load lead");
        }

        setLead(data.lead);
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || "Lead detail load nahi ho paaya");
      } finally {
        setLoadingLead(false);
      }
    };

    fetchLead();
  }, [token, leadId]);

  /* ---------------------------------------
     ✅ RENDER STATES
  ---------------------------------------- */
  if (loadingUser) {
    return (
      <DashboardLayout
        title="Lead Detail"
        profile={staffProfile || undefined}
      >
        <div className="flex items-center justify-center h-64 text-sm text-gray-500">
          Checking staff access...
        </div>
      </DashboardLayout>
    );
  }

  if (!token) return null;

  return (
    <DashboardLayout
      title="Lead Detail"
      profile={staffProfile || undefined}
    >
      <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
        {/* TOP BAR */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-semibold">
            Lead Detail
          </h1>
          <button
            onClick={() => router.back()}
            className="text-xs md:text-sm px-3 py-1 rounded border"
          >
            Back
          </button>
        </div>

        {/* LOADING / ERROR / MAIN */}
        {loadingLead ? (
          <div className="text-center text-sm text-gray-500 py-10">
            Loading lead details...
          </div>
        ) : !lead ? (
          <div className="text-center text-sm text-red-500 py-10">
            Lead not found or access denied.
          </div>
        ) : (
          <>
            {/* BASIC INFO CARD */}
            <div className="border rounded-lg p-4 bg-white space-y-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-base md:text-lg">
                    {lead.name}
                  </h2>
                  {lead.businessName && (
                    <div className="text-xs text-gray-600">
                      {lead.businessName}
                    </div>
                  )}
                  {lead.address && (
                    <div className="text-xs text-gray-600">
                      {lead.address}
                    </div>
                  )}
                  {lead.city && (
                    <div className="text-xs text-gray-600">
                      City: {lead.city}
                    </div>
                  )}
                </div>

                <div className="text-xs space-y-1 md:text-right">
                  {lead.phone && (
                    <div>
                      📞{" "}
                      <a
                        href={`tel:${lead.phone}`}
                        className="text-blue-600 underline"
                      >
                        {lead.phone}
                      </a>
                    </div>
                  )}
                  {lead.email && (
                    <div className="break-all">
                      ✉️ {lead.email}
                    </div>
                  )}
                  {lead.contactPerson && (
                    <div>Contact: {lead.contactPerson}</div>
                  )}
                </div>
              </div>

              {/* TAGS */}
              <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
                {lead.category && (
                  <span className="px-2 py-0.5 rounded-full bg-gray-100">
                    Category: {lead.category}
                  </span>
                )}
                {lead.status && (
                  <span className="px-2 py-0.5 rounded-full bg-gray-100">
                    Status: {lead.status}
                  </span>
                )}
                {lead.followupDate && (
                  <span className="px-2 py-0.5 rounded-full bg-gray-100">
                    Follow-up: {lead.followupDate}
                  </span>
                )}
                {lead.lastCalledAt?.seconds && (
                  <span className="px-2 py-0.5 rounded-full bg-gray-100">
                    Last Call:{" "}
                    {new Date(
                      lead.lastCalledAt.seconds * 1000
                    ).toLocaleString()}
                  </span>
                )}
              </div>

              {/* ADMIN / LAST NOTES */}
              {(lead.adminNote || lead.partnerNotes) && (
                <div className="mt-3 text-xs space-y-1">
                  {lead.adminNote && (
                    <div>
                      <span className="font-semibold">Admin Note: </span>
                      <span>{lead.adminNote}</span>
                    </div>
                  )}
                  {lead.partnerNotes && (
                    <div>
                      <span className="font-semibold">Last Telecaller Note: </span>
                      <span>{lead.partnerNotes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* NOTES HISTORY */}
            <div className="border rounded-lg p-4 bg-white">
              <h3 className="font-semibold mb-2 text-sm">Notes History</h3>

              {!lead.notes || lead.notes.length === 0 ? (
                <div className="text-xs text-gray-500">
                  No notes added yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {[...lead.notes]
                    .slice()
                    .sort((a, b) => {
                      const ta = a.createdAt
                        ? new Date(a.createdAt).getTime()
                        : 0;
                      const tb = b.createdAt
                        ? new Date(b.createdAt).getTime()
                        : 0;
                      return tb - ta; // latest first
                    })
                    .map((note, idx) => (
                      <div
                        key={idx}
                        className="border rounded p-2 text-xs space-y-1"
                      >
                        <div className="text-gray-800">
                          {note.text}
                        </div>
                        <div className="text-[10px] text-gray-500 flex justify-between">
                          <span>
                            By: {note.addedBy || "Unknown"}
                          </span>
                          {note.createdAt && (
                            <span>
                              {new Date(note.createdAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* CALL HISTORY */}
            <div className="border rounded-lg p-4 bg-white">
              <h3 className="font-semibold mb-2 text-sm">Call History</h3>

              {!lead.callLogs || lead.callLogs.length === 0 ? (
                <div className="text-xs text-gray-500">
                  No call history.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {[...lead.callLogs]
                    .slice()
                    .sort((a, b) => {
                      const ta = a.createdAt
                        ? new Date(a.createdAt).getTime()
                        : 0;
                      const tb = b.createdAt
                        ? new Date(b.createdAt).getTime()
                        : 0;
                      return tb - ta;
                    })
                    .map((log, idx) => (
                      <div
                        key={idx}
                        className="border rounded p-3 text-xs space-y-1"
                      >
                        {log.phone && <div>📞 {log.phone}</div>}
                        {log.outcome && (
                          <div>Outcome: {log.outcome}</div>
                        )}
                        {log.note && (
                          <div>Note: {log.note}</div>
                        )}
                        <div className="text-[10px] text-gray-500 flex justify-between">
                          <span>
                            By: {log.calledBy || "Unknown"}
                          </span>
                          {log.createdAt && (
                            <span>
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
