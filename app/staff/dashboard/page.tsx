"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase-client";
import { doc, getDoc } from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import toast from "react-hot-toast";

import TaskSidebar, { SidebarAction } from "./components/TaskSidebar";
import InterestedPartnersPage from "../interested/page";
import CallbackLeadsPage from "../callback/page";

/* ---------------------------------------
   TYPES
---------------------------------------- */
type Lead = {
  id: string;
  name?: string;
  businessName?: string;
  address?: string;
  phone?: string;
  email?: string;
  status: string;
  followupDate?: string; // callbackDate
  lastCalledAt?: any;
  lastNote?: string;
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

const CALL_FILTERS = ["all", "called", "not_called"];
const FOLLOWUP_FILTERS = ["all", "today", "upcoming", "overdue"];

/* ---------------------------------------
   COMPONENT
---------------------------------------- */
export default function TelecallerDashboardPage() {
  const router = useRouter();

  const [staffId, setStaffId] = useState<string | null>(null);
  const [token, setToken] = useState("");

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const [staffProfile, setStaffProfile] = useState<{ name?: string } | null>(
    null
  );

  /* 🔥 VIEW STATE */
  const [view, setView] = useState<
    "tasks" | "interested" | "callback"
  >("tasks");

  /* 🔥 TASK RANGE */
  const [taskRange, setTaskRange] = useState<
    "today" | "yesterday" | "week" | "month"
  >("today");

  /* 🔍 FILTER STATES */
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [callFilter, setCallFilter] = useState("all");
  const [followupFilter, setFollowupFilter] = useState("all");

  /* ---------------------------------------
     AUTH
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
        if (!snap.exists()) throw new Error();

        const profile = snap.data();
        if (
          profile.role !== "telecaller" ||
          profile.status !== "approved" ||
          profile.isActive !== true
        ) {
          throw new Error();
        }

        setStaffId(user.uid);
        setToken(await user.getIdToken());
        setStaffProfile({
          name:
            profile.name ||
            user.displayName ||
            user.email?.split("@")[0] ||
            "Telecaller",
        });
      } catch {
        await signOut(auth);
        router.push("/staff/login");
      } finally {
        setLoadingUser(false);
      }
    });

    return () => unsub();
  }, [router]);

  /* ---------------------------------------
     FETCH TASKS
  ---------------------------------------- */
  useEffect(() => {
    if (!staffId || !token || view !== "tasks") return;

    const fetchTasks = async () => {
      setLoadingLeads(true);
      try {
        const res = await fetch("/api/staff/leads/by-range", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ range: taskRange }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error();

        setLeads(data.tasks || []);

        const drafts: Record<string, string> = {};
        data.tasks?.forEach((l: Lead) => (drafts[l.id] = ""));
        setNotesDraft(drafts);
      } catch {
        toast.error("Tasks load nahi ho paaye");
      } finally {
        setLoadingLeads(false);
      }
    };

    fetchTasks();
  }, [staffId, token, taskRange, view]);

  /* ---------------------------------------
     SIDEBAR HANDLER
  ---------------------------------------- */
  const handleSidebarSelect = (action: SidebarAction) => {
    if (action.type === "range") {
      setView("tasks");
      setTaskRange(action.value);
    }
    if (action.type === "status") {
      setView(action.value);
    }
  };

  /* ---------------------------------------
     FILTER LOGIC
  ---------------------------------------- */
  const filteredLeads = useMemo(() => {
    if (view !== "tasks") return [];
    const now = new Date();

    return leads.filter((lead) => {
      if (
        search &&
        !(
          lead.name?.toLowerCase().includes(search.toLowerCase()) ||
          lead.businessName?.toLowerCase().includes(search.toLowerCase()) ||
          lead.phone?.includes(search)
        )
      )
        return false;

      if (statusFilter !== "all" && lead.status !== statusFilter) return false;
      if (callFilter === "called" && !lead.lastCalledAt) return false;
      if (callFilter === "not_called" && lead.lastCalledAt) return false;

      if (followupFilter !== "all" && lead.followupDate) {
        const f = new Date(lead.followupDate);
        if (followupFilter === "today" && f.toDateString() !== now.toDateString())
          return false;
        if (followupFilter === "upcoming" && f <= now) return false;
        if (followupFilter === "overdue" && f >= now) return false;
      }

      return true;
    });
  }, [leads, search, statusFilter, callFilter, followupFilter, view]);

  /* ---------------------------------------
     STATUS UPDATE (WITH CALLBACK DATE)
  ---------------------------------------- */
  const updateStatus = async (
    leadId: string,
    status: string,
    callbackDate?: string
  ) => {
    if (status === "callback" && !callbackDate) {
      return toast.error("Callback date zaroori hai");
    }

    try {
      const res = await fetch("/api/staff/leads/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ leadId, status, callbackDate }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error();

      toast.success("Status updated ✅");

      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? { ...l, status, followupDate: callbackDate }
            : l
        )
      );
    } catch {
      toast.error("Status update failed");
    }
  };

  /* ---------------------------------------
     NOTES SAVE
  ---------------------------------------- */
  const saveNote = async (leadId: string) => {
    const text = notesDraft[leadId];
    if (!text) return toast.error("Note khali hai");

    try {
      const res = await fetch("/api/staff/leads/update-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ leadId, text }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error();

      toast.success("Note saved ✅");
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, lastNote: text } : l))
      );
      setNotesDraft((p) => ({ ...p, [leadId]: "" }));
    } catch {
      toast.error("Note save failed");
    }
  };

  /* ---------------------------------------
     CONTACT HELPERS
  ---------------------------------------- */
  const openWhatsApp = (phone?: string, name?: string) => {
    if (!phone) return toast.error("Phone missing");
    const msg = `Namaste ${name || ""},\n\nMain ${
      staffProfile?.name || "Telecaller"
    } bol raha/rahi hoon – BharatComfort se.\nPlease hotel photos, room prices, category, address, GST (agar ho) aur owner Aadhaar share karein.`;
    window.location.href = `https://wa.me/91${phone.replace(
      /\D/g,
      ""
    )}?text=${encodeURIComponent(msg)}`;
  };

  const openEmail = (email?: string, name?: string) => {
    if (!email) return toast.error("Email missing");
    window.location.href = `mailto:${email}?subject=Business Listing – BharatComfort`;
  };

  /* ---------------------------------------
     UI
  ---------------------------------------- */
  if (loadingUser) {
    return (
      <DashboardLayout title="Telecaller Dashboard">
        <div className="h-64 flex items-center justify-center text-sm text-gray-500">
          Checking staff access...
        </div>
      </DashboardLayout>
    );
  }

  if (!staffId) return null;

  return (
    <DashboardLayout
      title="Telecaller Dashboard"
      profile={staffProfile || undefined}
    >
      <div className="grid grid-cols-[260px_1fr] gap-4 p-4">
        <TaskSidebar token={token} onSelect={handleSidebarSelect} />

        <div className="space-y-4">
          {view === "interested" && <InterestedPartnersPage token={token} />}
          {view === "callback" && <CallbackLeadsPage token={token} />}

          {view === "tasks" && (
            <div className="bg-white rounded shadow overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2">Name</th>
                    <th className="p-2">Phone</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Callback</th>
                    <th className="p-2">Note</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="border-t">
                      <td className="p-2">
                        {lead.name || lead.businessName}
                      </td>
                      <td className="p-2">{lead.phone}</td>

                      <td className="p-2">
                        <select
                          value={lead.status}
                          onChange={(e) => {
                            const st = e.target.value;
                            if (st === "callback") {
                              const d = prompt("Callback date (YYYY-MM-DD)");
                              updateStatus(lead.id, st, d || undefined);
                            } else {
                              updateStatus(lead.id, st);
                            }
                          }}
                          className="border px-1 text-xs"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-2 text-xs">
                        {lead.followupDate || "-"}
                      </td>

                      <td className="p-2">
                        <textarea
                          className="border w-full text-xs"
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
                          className="bg-black text-white px-2 py-1 text-xs mt-1"
                        >
                          Save
                        </button>
                        {lead.lastNote && (
                          <p className="text-xs text-gray-500 mt-1">
                            Last: {lead.lastNote}
                          </p>
                        )}
                      </td>

                      <td className="p-2 space-y-1">
                        <button
                          onClick={() =>
                            (window.location.href = `tel:${lead.phone}`)
                          }
                          className="bg-green-600 text-white text-xs px-2 py-1 w-full"
                        >
                          📞 Call
                        </button>
                        <button
                          onClick={() =>
                            openWhatsApp(
                              lead.phone,
                              lead.name || lead.businessName
                            )
                          }
                          className="bg-green-500 text-white text-xs px-2 py-1 w-full"
                        >
                          🟢 WhatsApp
                        </button>
                        <button
                          onClick={() =>
                            openEmail(
                              lead.email,
                              lead.name || lead.businessName
                            )
                          }
                          className="bg-blue-600 text-white text-xs px-2 py-1 w-full"
                        >
                          📧 Email
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
