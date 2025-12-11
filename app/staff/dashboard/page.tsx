"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase-client";
import { doc, getDoc } from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import toast from "react-hot-toast";
import TaskSidebar from "./components/TaskSidebar";

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
  lastCalledAt?: any;
};

/* ---------------------------------------
   CONSTANTS
---------------------------------------- */
const STATUS_OPTIONS = [
  "all",
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
  const [token, setToken] = useState<string>("");

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const [staffProfile, setStaffProfile] = useState<{
    name?: string;
    role?: "staff";
  } | null>(null);

  // ✅ FILTER STATES
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [callFilter, setCallFilter] = useState("all");
  const [followupFilter, setFollowupFilter] = useState("all");

  // ✅ My Tasks Range
  const [taskRange, setTaskRange] = useState<
    "today" | "yesterday" | "week" | "month"
  >("today");

  /* ---------------------------------------
     ✅ AUTH
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
          router.push("/staff/login");
          return;
        }

        const profile = snap.data();

        if (profile.role !== "telecaller") {
          await signOut(auth);
          router.push("/staff/login");
          return;
        }

        if (profile.status !== "approved" || profile.isActive !== true) {
          await signOut(auth);
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
     ✅ FETCH TASKS (BY RANGE)
  ---------------------------------------- */
  useEffect(() => {
    if (!staffId || !token) return;

    const fetchLeads = async () => {
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

        const list: Lead[] = data.tasks || [];
        setLeads(list);

        const draft: Record<string, string> = {};
        list.forEach((lead) => (draft[lead.id] = ""));
        setNotesDraft(draft);
      } catch {
        toast.error("Tasks load nahi ho paaye");
      } finally {
        setLoadingLeads(false);
      }
    };

    fetchLeads();
  }, [staffId, token, taskRange]);

  /* ---------------------------------------
     ✅ FILTER LOGIC
  ---------------------------------------- */
  const filteredLeads = useMemo(() => {
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
        if (
          followupFilter === "today" &&
          f.toDateString() !== now.toDateString()
        )
          return false;
        if (followupFilter === "upcoming" && f <= now) return false;
        if (followupFilter === "overdue" && f >= now) return false;
      }

      return true;
    });
  }, [leads, search, statusFilter, callFilter, followupFilter]);

  /* ---------------------------------------
     ✅ STATUS UPDATE
  ---------------------------------------- */
  const updateStatus = async (leadId: string, status: string) => {
    try {
      await fetch("/api/staff/leads/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ leadId, status }),
      });

      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId ? { ...lead, status } : lead
        )
      );

      toast.success("Status updated ✅");
    } catch {
      toast.error("Status update failed");
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
     ✅ WHATSAPP + EMAIL
  ---------------------------------------- */
  const openWhatsApp = (phone?: string, name?: string) => {
    if (!phone) return toast.error("Phone number nahi mila");

    const cleanPhone = phone.replace(/\D/g, "");
    const message = `Hello ${name || ""},\n\nThis is ${
      staffProfile?.name || "Telecaller"
    } from BharatComfort.\nWe contacted you regarding your business listing.\nPlease tell a good time to connect.`;

    window.location.href = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
      message
    )}`;
  };

  const openEmail = (email?: string, name?: string) => {
    if (!email) return toast.error("Email address nahi mila");

    const subject = "Regarding your Business Listing – BharatComfort";
    const body = `Hello ${name || ""},\n\nThis is ${
      staffProfile?.name || "Telecaller"
    } from BharatComfort.\nWe contacted you regarding your business listing.\nPlease let us know a suitable time to connect.\n\nThank you.`;

    window.location.href = `mailto:${email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  };

  /* ---------------------------------------
     ✅ UI
  ---------------------------------------- */
  if (loadingUser) {
    return (
      <DashboardLayout
        title="Telecaller Dashboard"
        profile={staffProfile || undefined}
      >
        <div className="flex items-center justify-center h-64 text-sm text-gray-500">
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
      <div className="p-4 space-y-4">

        {/* ✅ HEADER BAR WITH SETTINGS */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">My Tasks</h2>
          <button
            onClick={() => router.push("/staff/settings")}
            className="bg-black text-white px-3 py-1 text-sm rounded"
          >
            ⚙️ Settings
          </button>
        </div>

        {/* ✅ TASK RANGE */}
        <div className="bg-white rounded shadow p-2">
          <TaskSidebar token={token} onRangeSelect={setTaskRange} />
        </div>

        {/* ✅ FILTER BAR */}
        <div className="bg-white p-3 rounded shadow flex flex-wrap gap-3 items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name / business / phone"
            className="border px-3 py-1 text-sm w-64"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border px-3 py-1 text-sm"
          >
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st.toUpperCase()}
              </option>
            ))}
          </select>

          <select
            value={callFilter}
            onChange={(e) => setCallFilter(e.target.value)}
            className="border px-3 py-1 text-sm"
          >
            {CALL_FILTERS.map((c) => (
              <option key={c} value={c}>
                {c.replace("_", " ").toUpperCase()}
              </option>
            ))}
          </select>

          <select
            value={followupFilter}
            onChange={(e) => setFollowupFilter(e.target.value)}
            className="border px-3 py-1 text-sm"
          >
            {FOLLOWUP_FILTERS.map((f) => (
              <option key={f} value={f}>
                {f.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* ✅ TABLE */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {loadingLeads ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Loading your tasks...
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Koi matching lead nahi mili.
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
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredLeads.map((lead) => (
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
                        {STATUS_OPTIONS.filter((s) => s !== "all").map(
                          (st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          )
                        )}
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

                    <td className="p-3 space-y-1">
                      <button
                        onClick={() =>
                          (window.location.href = `tel:${lead.phone || ""}`)
                        }
                        className="w-full bg-green-600 text-white text-xs px-3 py-1 rounded"
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
                        className="w-full bg-green-500 text-white text-xs px-3 py-1 rounded"
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
                        className="w-full bg-blue-600 text-white text-xs px-3 py-1 rounded"
                      >
                        📧 Email
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
