"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase-client";
import { doc, getDoc } from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import toast from "react-hot-toast";

import TaskSidebar, {
  SidebarAction,
} from "./components/TaskSidebar";

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
  followupDate?: string;
  lastCalledAt?: any;
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

  const [staffProfile, setStaffProfile] = useState<{
    name?: string;
  } | null>(null);

  /* 🔥 SIDEBAR VIEW STATE */
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
     FETCH TASKS (ONLY FOR TASK VIEW)
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
        const draft: Record<string, string> = {};
        data.tasks?.forEach((l: Lead) => (draft[l.id] = ""));
        setNotesDraft(draft);
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
      setView(action.value); // interested | callback
    }
  };

  /* ---------------------------------------
     FILTER LOGIC (TASKS ONLY)
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

      if (statusFilter !== "all" && lead.status !== statusFilter)
        return false;

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
  }, [
    leads,
    search,
    statusFilter,
    callFilter,
    followupFilter,
    view,
  ]);

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

        {/* SIDEBAR */}
        <TaskSidebar
          token={token}
          onSelect={handleSidebarSelect}
        />

        {/* MAIN CONTENT */}
        <div className="space-y-4">

          {view === "interested" && (
            <InterestedPartnersPage token={token} />
          )}

          {view === "callback" && (
            <CallbackLeadsPage token={token} />
          )}

          {view === "tasks" && (
            <>
              {/* FILTER BAR */}
              <div className="bg-white p-3 rounded shadow flex flex-wrap gap-3">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name / business / phone"
                  className="border px-3 py-1 text-sm w-64"
                />

                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value)
                  }
                  className="border px-3 py-1 text-sm"
                >
                  <option value="all">ALL</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.toUpperCase()}
                    </option>
                  ))}
                </select>

                <select
                  value={callFilter}
                  onChange={(e) =>
                    setCallFilter(e.target.value)
                  }
                  className="border px-3 py-1 text-sm"
                >
                  {CALL_FILTERS.map((c) => (
                    <option key={c} value={c}>
                      {c.toUpperCase()}
                    </option>
                  ))}
                </select>

                <select
                  value={followupFilter}
                  onChange={(e) =>
                    setFollowupFilter(e.target.value)
                  }
                  className="border px-3 py-1 text-sm"
                >
                  {FOLLOWUP_FILTERS.map((f) => (
                    <option key={f} value={f}>
                      {f.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* TASK TABLE */}
              <div className="bg-white rounded shadow overflow-x-auto">
                {loadingLeads ? (
                  <div className="p-6 text-center text-sm text-gray-500">
                    Loading tasks...
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
                        <th className="p-3 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map((lead) => (
                        <tr
                          key={lead.id}
                          className="border-t"
                        >
                          <td className="p-3">
                            {lead.name ||
                              lead.businessName ||
                              "-"}
                          </td>
                          <td className="p-3">
                            {lead.businessName || "-"}
                          </td>
                          <td className="p-3">
                            {lead.phone || "-"}
                          </td>
                          <td className="p-3">
                            {lead.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
