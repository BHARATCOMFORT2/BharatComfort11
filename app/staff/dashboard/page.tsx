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
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);

  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const [staffProfile, setStaffProfile] = useState<{
    name?: string;
    role?: "staff";
  } | null>(null);

  // ✅ PHASE 3 FILTER STATES
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [callFilter, setCallFilter] = useState("all");
  const [followupFilter, setFollowupFilter] = useState("all");

  // ✅ SIDEBAR RANGE
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
     ✅ FETCH TASKS FROM SIDEBAR
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

        if (!res.ok || !data.success) {
          throw new Error(data?.message || "Failed to fetch tasks");
        }

        let list: Lead[] = data.tasks || [];
        setLeads(list);

        const draft: Record<string, string> = {};
        list.forEach((lead) => {
          draft[lead.id] = "";
        });
        setNotesDraft(draft);
      } catch (err: any) {
        toast.error(err?.message || "Tasks load nahi ho paaye");
      } finally {
        setLoadingLeads(false);
      }
    };

    fetchLeads();
  }, [staffId, token, taskRange]);

  /* ---------------------------------------
     ✅ PHASE 3 FILTER LOGIC (CLIENT SIDE)
  ---------------------------------------- */
  const filteredLeads = useMemo(() => {
    const now = new Date();

    return leads.filter((lead) => {
      // 🔍 SEARCH
      if (
        search &&
        !(
          lead.name?.toLowerCase().includes(search.toLowerCase()) ||
          lead.businessName?.toLowerCase().includes(search.toLowerCase()) ||
          lead.phone?.includes(search)
        )
      ) {
        return false;
      }

      // 📌 STATUS
      if (statusFilter !== "all" && lead.status !== statusFilter) {
        return false;
      }

      // 📞 CALL FILTER
      if (callFilter === "called" && !lead.lastCalledAt) return false;
      if (callFilter === "not_called" && lead.lastCalledAt) return false;

      // 📅 FOLLOW-UP FILTER
      if (followupFilter !== "all" && lead.followupDate) {
        const f = new Date(lead.followupDate);

        if (followupFilter === "today") {
          if (f.toDateString() !== now.toDateString()) return false;
        }

        if (followupFilter === "upcoming") {
          if (f <= now) return false;
        }

        if (followupFilter === "overdue") {
          if (f >= now) return false;
        }
      }

      return true;
    });
  }, [leads, search, statusFilter, callFilter, followupFilter]);

  /* ---------------------------------------
     ✅ STATUS UPDATE
  ---------------------------------------- */
  const updateStatus = async (leadId: string, status: string) => {
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
     ✅ UI
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

  return (
    <DashboardLayout title="Telecaller Dashboard" profile={staffProfile || undefined}>
      <div className="flex min-h-[70vh]">

        {/* ✅ TASK SIDEBAR */}
        <div className="w-64 hidden md:block">
          <TaskSidebar token={token} onRangeSelect={setTaskRange} />
        </div>

        {/* ✅ MAIN CONTENT */}
        <div className="flex-1 p-4 space-y-4">

          {/* ✅ PHASE 3 FILTER BAR */}
          <div className="bg-white p-3 rounded shadow flex flex-wrap gap-3 items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name / business / phone"
              className="border px-3 py-1 text-sm w-64"
            />

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border px-3 py-1 text-sm">
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>{st.toUpperCase()}</option>
              ))}
            </select>

            <select value={callFilter} onChange={(e) => setCallFilter(e.target.value)} className="border px-3 py-1 text-sm">
              {CALL_FILTERS.map((c) => (
                <option key={c} value={c}>{c.replace("_"," ").toUpperCase()}</option>
              ))}
            </select>

            <select value={followupFilter} onChange={(e) => setFollowupFilter(e.target.value)} className="border px-3 py-1 text-sm">
              {FOLLOWUP_FILTERS.map((f) => (
                <option key={f} value={f}>{f.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* ✅ LEADS TABLE (SAME AS PHASE 2, BASED ON filteredLeads) */}
          {/* ⚠️ Table part same rahega, filteredLeads pe map hota rahega */}
          
          {/* ✅ (Table intentionally skipped here because tum already use kar rahe ho 
              — isme sirf “leads” ke jagah “filteredLeads” use karna hoga.) */}
        </div>
      </div>
    </DashboardLayout>
  );
}
