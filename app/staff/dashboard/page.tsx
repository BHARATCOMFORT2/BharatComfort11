"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase-client";
import { doc, getDoc } from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import toast from "react-hot-toast";

import TaskSidebar, { SidebarAction } from "./components/TaskSidebar";
import InterestedPartnersPage from "../InterestedPartners/page";
import CallbackLeadsPage from "../CallbackLeads/page";
import CallLogsTab from "./components/CallLogsTab";

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

type EarningRecord = {
  id: string;
  date: string;
  baseAmount: number;
  bonus: number;
  penalty: number;
  totalEarning: number;
  remarks?: string;
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
   DATE HELPERS
---------------------------------------- */
const todayStr = () => new Date().toISOString().slice(0, 10);
const tomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};
const nextWeekStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
};
const isOverdue = (date?: string) =>
  date ? new Date(date) < new Date(new Date().toDateString()) : false;

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

  const [view, setView] = useState<"tasks" | "interested" | "callback">("tasks");
  const [taskRange, setTaskRange] = useState<
    "today" | "yesterday" | "week" | "month"
  >("today");
  const [activeTab, setActiveTab] = useState<"tasks" | "calllogs">("tasks");

  const [earnings, setEarnings] = useState<{
    totalEarning: number;
    records: EarningRecord[];
  } | null>(null);

  const [weeklyPerf, setWeeklyPerf] = useState<any>(null);
  const [monthlyPerf, setMonthlyPerf] = useState<any>(null);

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
        const d: Record<string, string> = {};
        data.tasks?.forEach((l: Lead) => (d[l.id] = ""));
        setNotesDraft(d);
      } catch {
        toast.error("Tasks load nahi ho paaye");
      } finally {
        setLoadingLeads(false);
      }
    };

    fetchTasks();
  }, [staffId, token, taskRange, view]);

  /* ---------------------------------------
     FETCH EARNINGS & PERFORMANCE
  ---------------------------------------- */
  useEffect(() => {
    if (!token) return;

    const fetchPerformance = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [eRes, wRes, mRes] = await Promise.all([
          fetch("/api/staff/earnings?range=month", { headers }),
          fetch("/api/staff/performance/weekly", { headers }),
          fetch("/api/staff/performance/monthly", { headers }),
        ]);

        const eData = await eRes.json();
        const wData = await wRes.json();
        const mData = await mRes.json();

        if (eData?.success) setEarnings(eData);
        if (wData?.success) setWeeklyPerf(wData);
        if (mData?.success) setMonthlyPerf(mData);
      } catch {}
    };

    fetchPerformance();
  }, [token]);

  /* ---------------------------------------
     SIDEBAR HANDLER
  ---------------------------------------- */
  const handleSidebarSelect = (action: SidebarAction) => {
    if (action.type === "range") {
      setView("tasks");
      setTaskRange(action.value);
      setActiveTab("tasks");
    }
    if (action.type === "status") {
      setView(action.value);
    }
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

        {/* ================= RIGHT CONTENT ================= */}
        <div className="space-y-4">

          {/* ===== Earnings & Performance ===== */}
          <div className="bg-white rounded shadow p-4">
            <h2 className="font-semibold mb-3">📊 Earnings & Performance</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <Stat label="This Month Earnings" value={`₹ ${earnings?.totalEarning || 0}`} />
              <Stat label="Weekly Rating" value={`${weeklyPerf?.data?.rating ?? "-"} ⭐`} />
              <Stat label="Monthly Rating" value={`${monthlyPerf?.data?.rating ?? "-"} ⭐`} />
              <Stat label="Monthly Conversions" value={monthlyPerf?.data?.conversions ?? "-"} />
            </div>

            {earnings?.records?.length ? (
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Base</th>
                    <th className="p-2">Bonus</th>
                    <th className="p-2">Penalty</th>
                    <th className="p-2">Total</th>
                    <th className="p-2">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.records.map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="p-2">{e.date}</td>
                      <td className="p-2">₹{e.baseAmount}</td>
                      <td className="p-2">₹{e.bonus}</td>
                      <td className="p-2">₹{e.penalty}</td>
                      <td className="p-2 font-semibold">₹{e.totalEarning}</td>
                      <td className="p-2">{e.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-gray-500">No earnings data available</p>
            )}
          </div>

          {/* ===== TABS ===== */}
          {view === "tasks" && (
            <>
              <div className="flex gap-4 border-b pb-2">
                <button
                  onClick={() => setActiveTab("tasks")}
                  className={`text-sm px-2 pb-1 ${
                    activeTab === "tasks"
                      ? "border-b-2 border-black font-medium"
                      : "text-gray-500"
                  }`}
                >
                  Tasks
                </button>

                <button
                  onClick={() => setActiveTab("calllogs")}
                  className={`text-sm px-2 pb-1 ${
                    activeTab === "calllogs"
                      ? "border-b-2 border-black font-medium"
                      : "text-gray-500"
                  }`}
                >
                  📞 Call Logs
                </button>
              </div>

              {activeTab === "calllogs" && <CallLogsTab token={token} />}
            </>
          )}

          {view === "interested" && <InterestedPartnersPage token={token} />}
          {view === "callback" && <CallbackLeadsPage token={token} />}

          {/* ===== TASKS TABLE ===== */}
          {view === "tasks" && activeTab === "tasks" && (
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
                        isOverdue(lead.followupDate) ? "bg-red-50" : ""
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
                                  updateStatus(lead.id, "callback", todayStr())
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
    </DashboardLayout>
  );
}

/* ---------------------------------------
   SMALL UI COMPONENT
---------------------------------------- */
function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-gray-50 p-3 rounded text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
