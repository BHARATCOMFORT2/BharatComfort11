"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase-client";

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
  lastCalledAt?: Timestamp | null;
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
  let from: Date | null = null;
  let to: Date | null = null;

  switch (range) {
    case "today":
      from = today;
      to = today;
      break;

    case "yesterday":
      from = new Date(today);
      to = new Date(today);
      from.setDate(from.getDate() - 1);
      to.setDate(to.getDate() - 1);
      break;

    case "week":
      from = new Date(today);
      from.setDate(from.getDate() - 6);
      to = today;
      break;

    case "month":
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      to = today;
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
  const [staffProfile, setStaffProfile] = useState<{ name?: string } | null>(
    null
  );

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
     READ RANGE FROM URL
  ---------------------------------------- */
  useEffect(() => {
    const r = searchParams.get("range");
    if (r) setTaskRange(r as DateRangeType);
  }, [searchParams]);

  /* ---------------------------------------
     AUTH CHECK
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
        setStaffProfile({
          name:
            profile.name ||
            user.displayName ||
            user.email?.split("@")[0],
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
            Object.fromEntries(
              (data.leads || []).map((l: Lead) => [l.id, ""])
            )
          );
        }
      } catch {
        if (alive) toast.error("Failed to load leads");
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
     STATUS UPDATE
  ---------------------------------------- */
  const updateStatus = async (
    leadId: string,
    status: string,
    callbackDate?: string
  ) => {
    if (status === "callback" && !callbackDate) {
      return toast.error("Callback date is required");
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

      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? { ...l, status, followupDate: callbackDate }
            : l
        )
      );
      setCallbackDates((p) => ({ ...p, [leadId]: "" }));
    } catch {
      toast.error("Status update failed");
    }
  };

  /* ---------------------------------------
     SAVE NOTE
  ---------------------------------------- */
  const saveNote = async (leadId: string) => {
    const text = notesDraft[leadId];
    if (!text?.trim()) return toast.error("Note is empty");

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
        p.map((l) =>
          l.id === leadId ? { ...l, lastNote: data.note.text } : l
        )
      );

      setNotesDraft((p) => ({ ...p, [leadId]: "" }));
    } catch {
      toast.error("Note save failed");
    }
  };

  /* ---------------------------------------
     ACTION HELPERS (FIXED)
  ---------------------------------------- */
  const logCall = async (lead: Lead) => {
    if (!token || !lead.id || !lead.phone) return;
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

  const openWhatsApp = (phone?: string, name?: string) => {
    if (!phone) return toast.error("Phone number missing");

    const clean = phone.replace(/\D/g, "");
    const message = `Hello ${name || ""}, this is BharatComfort team.`;

    window.open(
      `https://wa.me/91${clean}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  const openEmail = (email?: string, name?: string) => {
    if (!email) return toast.error("Email missing");

    const subject = "Regarding your business – BharatComfort";
    const body = `Hello ${name || ""},\n\nTeam BharatComfort here.`;

    window.location.href = `mailto:${email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  };

 /* UI */
if (loadingUser) {
  return (
    <div>Checking staff access...</div>
  );
}

if (!staffId) return null;

return (
  <div className="space-y-6">
        {/* 💰 EARNINGS */}
        <StaffEarningsModule token={token} />

        {/* 📊 PERFORMANCE */}
        <StaffPerformanceModule token={token} />

        <div className="space-y-4">
          {taskRange === "custom" && (
            <div className="flex gap-2">
              <input
                type="date"
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
              />
              <input
                type="date"
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
              />
            </div>
          )}

          <div className="text-xs text-gray-600">
            Showing <b>{leads.length}</b> leads{" "}
            {taskRange === "all" && "(All Time)"}
          </div>

          <div className="flex gap-4 border-b pb-2">
            <button onClick={() => setActiveTab("tasks")}>Tasks</button>
            <button onClick={() => setActiveTab("calllogs")}>
              📞 Call Logs
            </button>
          </div>

          {activeTab === "calllogs" && <CallLogsTab token={token} />}

          {activeTab === "tasks" && (
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
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className={`border-t ${
                        isOverdue(lead.followupDate)
                          ? "bg-red-50"
                          : ""
                      }`}
                    >
                      <td className="p-2">
                        {lead.name || lead.businessName}
                      </td>
                      <td className="p-2">{lead.phone}</td>

                      <td className="p-2">
                        <select
                          value={lead.status}
                          onChange={(e) => {
                            const st = e.target.value;
                            if (st !== "callback") {
                              updateStatus(lead.id, st);
                            }
                          }}
                          className="border text-xs"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-2">
                        {lead.status === "callback" && (
                          <>
                            <input
                              type="date"
                              value={
                                callbackDates[lead.id] ||
                                lead.followupDate ||
                                ""
                              }
                              onChange={(e) =>
                                setCallbackDates((p) => ({
                                  ...p,
                                  [lead.id]: e.target.value,
                                }))
                              }
                              className="border text-xs"
                            />

                            <div className="flex gap-1 mt-1">
                             <button
  onClick={() =>
    setCallbackDates((p) => ({
      ...p,
      [lead.id]: todayStr(),
    }))
  }
  className="text-xs px-1 bg-gray-200"
>
  Today
</button>
                             <button
  onClick={() =>
    setCallbackDates((p) => ({
      ...p,
      [lead.id]: tomorrowStr(),
    }))
  }
  className="text-xs px-1 bg-gray-200"
>
  Tomorrow
</button>

<button
  onClick={() =>
    setCallbackDates((p) => ({
      ...p,
      [lead.id]: nextWeekStr(),
    }))
  }
  className="text-xs px-1 bg-gray-200"
>
  Next Week
</button>
 </div>
<button
  onClick={() => {
    const date =
      callbackDates[lead.id] || lead.followupDate;

    if (!date) {
      toast.error("Callback date select karo");
      return;
    }

    updateStatus(lead.id, "callback", date);
  }}
  className="mt-1 bg-orange-600 text-white text-xs px-2 py-1"
>
  Save Callback
</button>

                        )}
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
                          className="bg-black text-white text-xs px-2 py-1 mt-1"
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
                          onClick={() => {
                            logCall(lead);
                            window.location.href = `tel:${lead.phone}`;
                          }}
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
);
}
