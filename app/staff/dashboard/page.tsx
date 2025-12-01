"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase-client";
import { doc, getDoc } from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import toast from "react-hot-toast";

/* ---------------------------------------
   TYPES
---------------------------------------- */
type Lead = {
  id: string;
  name?: string;
  businessName?: string;
  address?: string;
  phone?: string;
  contactPerson?: string;
  email?: string;
  status: string;
  followupDate?: string;
  category?: string;
  adminNote?: string;
  dueDate?: any;
};

/* ---------------------------------------
   CONSTANTS
---------------------------------------- */
const STATUS_OPTIONS = [
  "new",
  "contacted",
  "interested",
  "not_interested",
  "callback",
  "converted",
  "invalid",
];

/* ---------------------------------------
   COMPONENT
---------------------------------------- */
export default function TelecallerDashboardPage() {
  const router = useRouter();

  const [staffId, setStaffId] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);

  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [callOutcome, setCallOutcome] = useState<Record<string, string>>({});
  const [callNote, setCallNote] = useState<Record<string, string>>({});

  const [staffProfile, setStaffProfile] = useState<{
    name?: string;
    role?: "staff";
  } | null>(null);

  /* ---------------------------------------
     ✅ STAFF AUTH + APPROVAL
  ---------------------------------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStaffId(null);
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
          toast.error("Telecaller only access");
          router.push("/staff/login");
          return;
        }

        if (profile.status !== "approved" || profile.isActive !== true) {
          await signOut(auth);
          toast("Account not active", { icon: "⏳" });
          router.push("/staff/login");
          return;
        }

        setStaffId(user.uid);
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
     ✅ FETCH LEADS (✅ FINAL FIX)
     BACKEND RETURNS: { success: true, data: [] }
  ---------------------------------------- */
  useEffect(() => {
    if (!staffId || !token) return;

    const fetchLeads = async () => {
      setLoadingLeads(true);
      try {
        const res = await fetch("/api/staff/leads", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ staffId }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data?.message || "Failed to fetch leads");
        }

        // ✅ ✅ ✅ FINAL MATCH WITH BACKEND
        let list: Lead[] = data.data || [];

        setLeads(list);

        const draft: Record<string, string> = {};
        list.forEach((lead) => {
          draft[lead.id] = "";
        });
        setNotesDraft(draft);
      } catch (err: any) {
        console.error("Telecaller leads fetch error:", err);
        toast.error(err?.message || "Leads load nahi ho paaye");
      } finally {
        setLoadingLeads(false);
      }
    };

    fetchLeads();
  }, [staffId, token]);

  /* ---------------------------------------
     ✅ STATUS UPDATE
  ---------------------------------------- */
  const updateStatus = async (leadId: string, status: string) => {
    if (!token) return toast.error("Please re-login");

    setSavingLeadId(leadId);
    try {
      const res = await fetch("/api/staff/leads/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ leadId, status }),
      });

      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data?.message || "Status update failed");

      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId ? { ...lead, status } : lead
        )
      );

      toast.success("Status updated ✅");
    } catch (err: any) {
      toast.error(err?.message || "Status update failed");
    } finally {
      setSavingLeadId(null);
    }
  };

  /* ---------------------------------------
     ✅ NOTES UPDATE
  ---------------------------------------- */
  const saveNote = async (leadId: string) => {
    const text = notesDraft[leadId];
    if (!text) return toast.error("Note khali hai");

    try {
      await fetch("/api/staff/leads/update-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ leadId, text }),
      });

      toast.success("Note saved ✅");
      setNotesDraft((p) => ({ ...p, [leadId]: "" }));
    } catch {
      toast.error("Note save failed");
    }
  };

  /* ---------------------------------------
     ✅ LOADING BLOCK
  ---------------------------------------- */
  if (loadingUser) {
    return (
      <DashboardLayout title="Telecaller Dashboard" profile={staffProfile || undefined}>
        <div className="flex items-center justify-center h-64 text-sm text-gray-500">
          Checking staff access...
        </div>
      </DashboardLayout>
    );
  }

  if (!staffId) return null;

  /* ---------------------------------------
     ✅ FINAL UI
  ---------------------------------------- */
  return (
    <DashboardLayout title="Telecaller Dashboard" profile={staffProfile || undefined}>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loadingLeads ? (
          <div className="p-6 text-center text-sm text-gray-500">
            Loading your tasks...
          </div>
        ) : leads.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            Abhi koi task assign nahi hua.
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Business</th>
                <th className="p-3 text-left">Phone</th>
                <th className="p-3 text-left">Address</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Note</th>
                <th className="p-3 text-left">Call</th>
              </tr>
            </thead>

            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t">
                  <td className="p-3">
                    {lead.name || lead.businessName || "-"}
                  </td>
                  <td className="p-3">{lead.businessName || "-"}</td>
                  <td className="p-3">{lead.phone || "-"}</td>
                  <td className="p-3">{lead.address || "-"}</td>

                  <td className="p-3">
                    <select
                      className="border px-2 py-1 text-xs"
                      value={lead.status}
                      onChange={(e) =>
                        updateStatus(lead.id, e.target.value)
                      }
                    >
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="p-3">
                    <textarea
                      className="border w-full p-1 text-xs"
                      value={notesDraft[lead.id] || ""}
                      onChange={(e) =>
                        setNotesDraft((p) => ({
                          ...p,
                          [lead.id]: e.target.value,
                        }))
                      }
                    />
                    <button
                      onClick={() => saveNote(lead.id)}
                      className="mt-1 bg-black text-white px-2 py-1 text-xs rounded"
                    >
                      Save
                    </button>
                  </td>

                  <td className="p-3">
                    <button
                      onClick={() =>
                        window.open(`tel:${lead.phone || ""}`)
                      }
                      className="bg-green-600 text-white text-xs px-3 py-1 rounded"
                    >
                      📞 Call
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
}
