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
  name: string;
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

const STATUS_OPTIONS = [
  "new",
  "contacted",
  "interested",
  "not_interested",
  "callback",
  "converted",
  "invalid",
];

const CATEGORY_TABS = [
  { label: "All", value: "all" },
  { label: "Hotels", value: "hotel" },
  { label: "Restaurants", value: "restaurant" },
  { label: "Cafes", value: "cafe" },
  { label: "Dhabas", value: "dhaba" },
  { label: "Guest House", value: "guesthouse" },
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

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [callOutcome, setCallOutcome] = useState<Record<string, string>>({});
  const [callNote, setCallNote] = useState<Record<string, string>>({});

  const [staffProfile, setStaffProfile] = useState<{
    name?: string;
    role?: "staff";
  } | null>(null);

  /* ---------------------------------------
     ✅ STAFF AUTH + APPROVAL CHECK
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
          toast.error("This dashboard is for telecallers only");
          router.push("/staff/login");
          return;
        }

        if (profile.status !== "approved" || profile.isActive !== true) {
          await signOut(auth);
          toast("Your account is not active", { icon: "⏳" });
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
     ✅ DEFAULT DATE = TODAY
  ---------------------------------------- */
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  /* ---------------------------------------
     ✅ FETCH LEADS (NEW API)
  ---------------------------------------- */
  useEffect(() => {
    if (!staffId || !selectedDate) return;

    const fetchLeads = async () => {
      setLoadingLeads(true);
      try {
        const res = await fetch("/api/staff/leads/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staffId,
            date: selectedDate,
            category: selectedCategory,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data?.message || "Failed to fetch leads");
        }

        const list: Lead[] = data.leads || [];
        setLeads(list);

        const draft: Record<string, string> = {};
        list.forEach((lead) => {
          draft[lead.id] = "";
        });
        setNotesDraft(draft);
      } catch (err: any) {
        toast.error(err?.message || "Leads load nahi ho paaye");
      } finally {
        setLoadingLeads(false);
      }
    };

    fetchLeads();
  }, [staffId, selectedDate, selectedCategory]);

  /* ---------------------------------------
     ✅ STATUS UPDATE
  ---------------------------------------- */
  const updateStatus = async (leadId: string, status: string) => {
    if (!token) return toast.error("Please re-login");

    setSavingLeadId(leadId);
    try {
      const res = await fetch("/api/staff/leads/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          text,
          staffId,
        }),
      });

      toast.success("Note saved ✅");
      setNotesDraft((p) => ({ ...p, [leadId]: "" }));
    } catch {
      toast.error("Note save failed");
    }
  };

  /* ---------------------------------------
     ✅ CALL LOG
  ---------------------------------------- */
  const saveCallLog = async (lead: Lead) => {
    try {
      await fetch("/api/staff/leads/log-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          phone: lead.phone,
          outcome: callOutcome[lead.id],
          note: callNote[lead.id],
          staffId,
        }),
      });

      toast.success("Call log saved ✅");
      setCallOutcome((p) => ({ ...p, [lead.id]: "" }));
      setCallNote((p) => ({ ...p, [lead.id]: "" }));
    } catch {
      toast.error("Call log save failed");
    }
  };

  const isOverdue = (dueDate: any, status: string) => {
    if (!dueDate?.seconds) return false;
    if (status === "converted") return false;
    const due = new Date(dueDate.seconds * 1000);
    return Date.now() > due.getTime();
  };

  /* ---------------------------------------
     ✅ LOADING BLOCK
  ---------------------------------------- */
  if (loadingUser) {
    return (
      <DashboardLayout
        title="Telecaller Task Dashboard"
        profile={staffProfile || undefined}
      >
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
    <DashboardLayout
      title="Telecaller Task Dashboard"
      profile={staffProfile || undefined}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Telecaller Lead Dashboard</h1>
          <p className="text-sm text-gray-500">
            Ye saare leads hi tumhare <b>tasks</b> hain. <b>Converted = DONE</b>
          </p>
        </div>

        {/* ✅ DATE + CATEGORY FILTER */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border px-2 py-1 rounded text-sm"
          />

          <div className="flex flex-wrap gap-2">
            {CATEGORY_TABS.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`text-xs px-3 py-1 rounded-full border ${
                  selectedCategory === cat.value
                    ? "bg-black text-white"
                    : "bg-gray-100"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* ✅ LEADS TABLE */}
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
                  <th className="p-3 text-left">Lead</th>
                  <th className="p-3 text-left">Phone</th>
                  <th className="p-3 text-left">Category</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Note</th>
                  <th className="p-3 text-left">Call</th>
                  <th className="p-3 text-center">Done</th>
                </tr>
              </thead>

              <tbody>
                {leads.map((lead) => {
                  const done = lead.status === "converted";
                  const overdue = isOverdue(lead.dueDate, lead.status);

                  return (
                    <tr
                      key={lead.id}
                      className={`border-t ${overdue ? "bg-red-50" : ""}`}
                    >
                      <td className="p-3 font-medium">{lead.name}</td>

                      <td className="p-3">{lead.phone || "-"}</td>

                      <td className="p-3 text-xs">{lead.category}</td>

                      <td className="p-3">
                        <select
                          className="border rounded px-2 py-1 text-xs"
                          value={lead.status}
                          disabled={savingLeadId === lead.id}
                          onChange={(e) =>
                            updateStatus(lead.id, e.target.value)
                          }
                        >
                          {STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>
                              {st.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-3">
                        <textarea
                          className="border rounded w-full text-xs p-2"
                          rows={2}
                          value={notesDraft[lead.id] ?? ""}
                          onChange={(e) =>
                            setNotesDraft((prev) => ({
                              ...prev,
                              [lead.id]: e.target.value,
                            }))
                          }
                        />
                        <button
                          onClick={() => saveNote(lead.id)}
                          className="mt-1 px-2 py-1 text-xs bg-black text-white rounded"
                        >
                          Save
                        </button>
                      </td>

                      <td className="p-3 space-y-1">
                        <button
                          onClick={() => window.open(`tel:${lead.phone}`)}
                          className="text-xs bg-green-600 text-white px-3 py-1 rounded"
                        >
                          📞 Call
                        </button>

                        <select
                          value={callOutcome[lead.id] || ""}
                          onChange={(e) =>
                            setCallOutcome((p) => ({
                              ...p,
                              [lead.id]: e.target.value,
                            }))
                          }
                          className="w-full border px-2 py-1 rounded text-xs"
                        >
                          <option value="">Outcome</option>
                          <option value="not_answered">Not Answered</option>
                          <option value="busy">Busy</option>
                          <option value="interested">Interested</option>
                          <option value="not_interested">Not Interested</option>
                          <option value="followup_required">Follow-up</option>
                        </select>

                        <textarea
                          placeholder="Call note"
                          value={callNote[lead.id] || ""}
                          onChange={(e) =>
                            setCallNote((p) => ({
                              ...p,
                              [lead.id]: e.target.value,
                            }))
                          }
                          className="w-full border rounded px-2 py-1 text-xs"
                        />

                        <button
                          onClick={() => saveCallLog(lead)}
                          className="text-xs bg-purple-600 text-white px-3 py-1 rounded"
                        >
                          Save Call
                        </button>
                      </td>

                      <td className="p-3 text-center">
                        <button
                          onClick={() =>
                            !done &&
                            updateStatus(lead.id, "converted")
                          }
                          disabled={done}
                          className={`px-3 py-1 text-xs rounded ${
                            done
                              ? "bg-green-100 text-green-700"
                              : "bg-green-600 text-white"
                          }`}
                        >
                          {done ? "Done" : "Mark Done"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
