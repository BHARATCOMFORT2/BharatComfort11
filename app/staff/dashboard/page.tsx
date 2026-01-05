"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase-client";
import { doc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";

import CallLogsTab from "./components/CallLogsTab";
import StaffEarningsModule from "./earnings/StaffEarningsModule";
import StaffPerformanceModule from "./performance/StaffPerformanceModule";

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

 /*---------------------------------------
   DATE HELPERS (FINAL + COMPLETE)
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

type DateRangeType =
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "last_month"
  | "custom"
  | "all";

const rangeToDates = (
  range: DateRangeType,
  customFrom?: string,
  customTo?: string
) => {
  const today = startOfToday();
  let from: Date | null = new Date(today);
  let to: Date | null = new Date(today);

  switch (range) {
    case "today":
      break;

    case "yesterday":
      from!.setDate(from!.getDate() - 1);
      to!.setDate(to!.getDate() - 1);
      break;

    case "week":
      from!.setDate(from!.getDate() - 6);
      break;

    case "month":
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      break;

    case "last_month":
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      to = new Date(today.getFullYear(), today.getMonth(), 0);
      break;

    case "custom":
      if (!customFrom || !customTo) {
        throw new Error("Custom date range missing");
      }
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

  const [staffId, setStaffId] = useState<string | null>(null);
  const [token, setToken] = useState("");

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [callbackDates, setCallbackDates] = useState<Record<string, string>>(
    {}
  );

  const [staffProfile, setStaffProfile] = useState<{ name?: string } | null>(
    null
  );


 const [taskRange, setTaskRange] = useState<DateRangeType>("today");

const [customFromDate, setCustomFromDate] = useState("");
const [customToDate, setCustomToDate] = useState("");


  const [activeTab, setActiveTab] = useState<"tasks" | "calllogs">("tasks");
const searchParams = useSearchParams();

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
useEffect(() => {
  if (!token || !staffId) return;
  if (taskRange === "custom" && (!customFromDate || !customToDate)) return;

  const fetchTasks = async () => {
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
      }).toString();

      const res = await fetch(
        `/api/staff/leads/by-range?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error();

      setLeads(data.leads || []);

      const d: Record<string, string> = {};
      data.leads?.forEach((l: Lead) => {
        d[l.id] = "";
      });
      setNotesDraft(d);
    } catch {
      toast.error("Tasks load nahi ho paaye");
    } finally {
      setLoadingLeads(false);
    }
  };

  fetchTasks();
}, [
  token,
  staffId,
  taskRange,
  customFromDate,
  customToDate,
]);


   
  /* ---------------------------------------
     STATUS UPDATE
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
   SAVE NOTE
---------------------------------------- */
const saveNote = async (leadId: string) => {
  const text = notesDraft[leadId];

  // ✅ empty / spaces-only note block
  if (!text?.trim()) {
    return toast.error("Note khali hai");
  }

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

    // ✅ strong success check
    if (!res.ok || !data.success || !data.note) {
      throw new Error();
    }

    // ✅ backend-returned note se UI sync
    setLeads((p) =>
      p.map((l) =>
        l.id === leadId
          ? { ...l, lastNote: data.note.text }
          : l
      )
    );

    // ✅ clear textarea
    setNotesDraft((p) => ({ ...p, [leadId]: "" }));
  } catch {
    toast.error("Note save failed");
  }
};
 /* ---------------------------------------
   CALL LOG
---------------------------------------- */
const logCall = async (lead: Lead) => {
  if (!token || !lead?.id || !lead?.phone) return;

  try {
    const res = await fetch("/api/staff/calls/log", {
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

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success) {
      throw new Error("Call log failed");
    }
  } catch (err) {
    console.error("Call log error:", err);
  }
};

  /* ---------------------------------------
     WHATSAPP
  ---------------------------------------- */
  const openWhatsApp = (phone?: string, name?: string) => {
    if (!phone) return toast.error("Phone number nahi mila");

    const clean = phone.replace(/\D/g, "");
    const message = `Namaste Sir/Ma'am ${name || ""},

   BharatComfort team se aapse aapke business ka free listings ke regarding contact kar rahe hain.

Aapke hotel/business ko BharatComfort par list karne ke liye kuch basic details chahiye:

🏨 Hotel / Property Photos
🛏 Room Categories
💰 Room Prices
📍 Complete Address
🧾 GST (optional)
🪪 Owner Aadhaar (optional)

Aap yeh details yahin WhatsApp par bhej sakte hain.

Dhanyavaad 🙏
BharatComfort Team`;

    window.location.href = `https://wa.me/91${clean}?text=${encodeURIComponent(
      message
    )}`;
  };

  /* ---------------------------------------
     EMAIL
  ---------------------------------------- */
  const openEmail = (email?: string, name?: string) => {
    if (!email) return toast.error("Email address nahi mila");

    const subject = "Regarding Your Business Listing – BharatComfort";
    const body = `Hello ${name || ""},

This is ${staffProfile?.name || "Telecaller"} from BharatComfort.

We are reaching out regarding listing your business with us.
Please share required details at your convenience.

Website: https://www.bharatcomfort.online

Thank you,
BharatComfort Team`;

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
   <div className="p-4">
     
      {/* ================= RIGHT CONTENT ================= */}
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
                                  updateStatus(
                                    lead.id,
                                    "callback",
                                    todayStr()
                                  )
                                }
                                className="text-xs px-1 bg-gray-200"
                              >
                                Today
                              </button>
                              <button
                                onClick={() =>
                                  updateStatus(
                                    lead.id,
                                    "callback",
                                    tomorrowStr()
                                  )
                                }
                                className="text-xs px-1 bg-gray-200"
                              >
                                Tomorrow
                              </button>
                              <button
                                onClick={() =>
                                  updateStatus(
                                    lead.id,
                                    "callback",
                                    nextWeekStr()
                                  )
                                }
                                className="text-xs px-1 bg-gray-200"
                              >
                                Next Week
                              </button>
                            </div>

                            <button
                              onClick={() =>
                                updateStatus(
                                  lead.id,
                                  "callback",
                                  callbackDates[lead.id]
                                )
                              }
                              className="mt-1 bg-orange-600 text-white text-xs px-2 py-1"
                            >
                              Save Callback
                            </button>
                          </>
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
    </div>
);
}
