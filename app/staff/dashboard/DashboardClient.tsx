"use client";

import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase-client";
import { doc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";

import CallLogsTab from "./components/CallLogsTab";
import StaffEarningsModule from "./earnings/StaffEarningsModule";
import StaffPerformanceModule from "./performance/StaffPerformanceModule";

export const dynamic = "force-dynamic";

/* ---------------------------------------
   TYPES
---------------------------------------- */
type Lead = {
  id: string;
  name?: string;
  businessName?: string;
  phone?: string;
  email?: string;
  status: string;
  followupDate?: string;
  lastNote?: string;
};

type DateRangeType =
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "last_month"
  | "custom"
  | "all";

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
   DATE HELPERS
---------------------------------------- */
const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const todayStr = () => toDateStr(startOfToday());
const tomorrowStr = () => {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return toDateStr(d);
};
const nextWeekStr = () => {
  const d = startOfToday();
  d.setDate(d.getDate() + 7);
  return toDateStr(d);
};

const rangeToDates = (
  range: DateRangeType,
  customFrom?: string,
  customTo?: string
) => {
  const today = startOfToday();
  let from: Date | null = new Date(today);
  let to: Date | null = new Date(today);

  switch (range) {
    case "yesterday":
      from.setDate(from.getDate() - 1);
      to.setDate(to.getDate() - 1);
      break;
    case "week":
      from.setDate(from.getDate() - 6);
      break;
    case "month":
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case "last_month":
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      to = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
    case "custom":
      if (!customFrom || !customTo) throw new Error();
      from = new Date(customFrom);
      to = new Date(customTo);
      break;
    case "all":
      return { fromDate: null, toDate: null };
  }

  return {
    fromDate: from ? toDateStr(from) : null,
    toDate: to ? toDateStr(to) : null,
  };
};

const isOverdue = (date?: string) =>
  date ? new Date(date) < startOfToday() : false;

/* ---------------------------------------
   COMPONENT
---------------------------------------- */
export default function TelecallerDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [staffId, setStaffId] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [staffName, setStaffName] = useState("Telecaller");
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [callbackDates, setCallbackDates] = useState<Record<string, string>>(
    {}
  );

  const [taskRange, setTaskRange] = useState<DateRangeType>("today");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [activeTab, setActiveTab] = useState<"tasks" | "calllogs">("tasks");

  /* ---------------------------------------
     READ RANGE
  ---------------------------------------- */
  useEffect(() => {
    const r = searchParams.get("range") as DateRangeType | null;
    if (r) setTaskRange(r);
  }, [searchParams]);

  /* ---------------------------------------
     AUTH
  ---------------------------------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return router.push("/staff/login");

      try {
        const snap = await getDoc(doc(db, "staff", user.uid));
        if (!snap.exists()) throw new Error();

        const profile = snap.data();
        if (
          profile.role !== "telecaller" ||
          profile.status !== "approved" ||
          profile.isActive !== true
        )
          throw new Error();

        setStaffId(user.uid);
        setToken(await user.getIdToken());
        setStaffName(
          profile.name ||
            user.displayName ||
            user.email?.split("@")[0] ||
            "Telecaller"
        );
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
     FETCH LEADS
  ---------------------------------------- */
  useEffect(() => {
    if (!token || !staffId) return;
    if (taskRange === "custom" && (!customFromDate || !customToDate)) return;

    let alive = true;

    const fetchLeads = async () => {
      setLoadingLeads(true);
      try {
        const { fromDate, toDate } = rangeToDates(
          taskRange,
          customFromDate,
          customToDate
        );

        const params = new URLSearchParams({
          range: taskRange,
          ...(fromDate ? { from: fromDate } : {}),
          ...(toDate ? { to: toDate } : {}),
        });

        const res = await fetch(
          `/api/staff/leads/by-range?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error();

        if (alive) {
          setLeads(data.leads || []);
          setNotesDraft(
            Object.fromEntries((data.leads || []).map((l: Lead) => [l.id, ""]))
          );
        }
      } catch {
        if (alive) setLeads([]);
      } finally {
        if (alive) setLoadingLeads(false);
      }
    };

    fetchLeads();
    return () => {
      alive = false;
    };
  }, [token, staffId, taskRange, customFromDate, customToDate]);

  /* ---------------------------------------
     ACTIONS
  ---------------------------------------- */
  const logCall = async (lead: Lead) => {
    if (!lead.id || !lead.phone) return;
    try {
      await fetch("/api/staff/calls/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          leadId: lead.id,
          phone: lead.phone,
          outcome: "dialed",
        }),
      });
    } catch {}
  };

  const updateStatus = async (
    leadId: string,
    status: string,
    callbackDate?: string
  ) => {
    if (status === "callback" && !callbackDate)
      return toast.error("Callback date required");

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

      setLeads((p) =>
        p.map((l) =>
          l.id === leadId ? { ...l, status, followupDate: callbackDate } : l
        )
      );
    } catch {
      toast.error("Status update failed");
    }
  };

  const saveNote = async (leadId: string) => {
    const text = notesDraft[leadId];
    if (!text?.trim()) return toast.error("Note empty");

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

      setLeads((p) =>
        p.map((l) => (l.id === leadId ? { ...l, lastNote: text } : l))
      );
      setNotesDraft((p) => ({ ...p, [leadId]: "" }));
    } catch {
      toast.error("Note save failed");
    }
  };

  const openWhatsApp = (phone?: string, name?: string) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, "");
    const msg = `Namaste ${name || ""}, BharatComfort team here regarding free listing.`;
    window.location.href = `https://wa.me/91${clean}?text=${encodeURIComponent(
      msg
    )}`;
  };

  const openEmail = (email?: string, name?: string) => {
    if (!email) return;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(
      "BharatComfort Listing"
    )}`;
  };

  /* ---------------------------------------
     EARLY RETURN
  ---------------------------------------- */
  if (loadingUser) return <div>Checking staff access...</div>;
  if (!staffId) return null;

  /* ---------------------------------------
     RENDER
  ---------------------------------------- */
  return (
    <div className="space-y-6">
      <StaffEarningsModule token={token} />
      <StaffPerformanceModule token={token} />

      <div className="flex gap-4 border-b pb-2">
        <button onClick={() => setActiveTab("tasks")}>Tasks</button>
        <button onClick={() => setActiveTab("calllogs")}>📞 Call Logs</button>
      </div>

      {activeTab === "calllogs" && <CallLogsTab token={token} />}

      {activeTab === "tasks" && (
        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className={isOverdue(lead.followupDate) ? "bg-red-50" : ""}
                >
                  <td className="p-2">{lead.name || lead.businessName}</td>
                  <td className="p-2">{lead.phone}</td>
                  <td className="p-2">
                    <select
                      value={lead.status}
                      onChange={(e) =>
                        updateStatus(lead.id, e.target.value)
                      }
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <textarea
                      value={notesDraft[lead.id] || ""}
                      onChange={(e) =>
                        setNotesDraft((p) => ({
                          ...p,
                          [lead.id]: e.target.value,
                        }))
                      }
                    />
                    <button onClick={() => saveNote(lead.id)}>Save</button>
                  </td>
                  <td className="p-2 space-y-1">
                    <button
                      onClick={() => {
                        logCall(lead);
                        window.location.href = `tel:${lead.phone}`;
                      }}
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
  );
}
