"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

/* ---------------------------------------
   TYPES
---------------------------------------- */

type Task = {
  id: string;
  name?: string;
  businessName?: string;
  phone?: string;
  status?: string;
  followupDate?: string;
};

type SummaryResponse = {
  today: Task[];
  yesterday: Task[];
  week: Task[];
  month: Task[];
  lastMonth?: Task[];
  all?: Task[];
};

export type SidebarAction =
  | {
      type: "range";
      value:
        | "today"
        | "yesterday"
        | "week"
        | "month"
        | "last_month"
        | "all"
        | "custom";
    }
  | { type: "status"; value: "interested" | "callback" };

type Props = {
  token: string;
  onSelect: (action: SidebarAction) => void;
};

/* ---------------------------------------
   COMPONENT
---------------------------------------- */

export default function TaskSidebar({ token, onSelect }: Props) {
  const [loading, setLoading] = useState(true);

  const [activeRange, setActiveRange] = useState<
    "today" | "yesterday" | "week" | "month" | "last_month" | "all" | "custom"
  >("today");

  const [activeStatus, setActiveStatus] = useState<
    "interested" | "callback" | null
  >(null);

  const [summary, setSummary] = useState<SummaryResponse>({
    today: [],
    yesterday: [],
    week: [],
    month: [],
    lastMonth: [],
    all: [],
  });

  /* ---------------------------------------
     FETCH TASK SUMMARY
  ---------------------------------------- */
  useEffect(() => {
    if (!token) return;

    const loadSummary = async () => {
      try {
        setLoading(true);

        const res = await fetch("/api/staff/leads/by-range", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data?.message || "Failed to load tasks");
        }

        setSummary({
          today: data.summary?.today || [],
          yesterday: data.summary?.yesterday || [],
          week: data.summary?.week || [],
          month: data.summary?.month || [],
          lastMonth: data.summary?.lastMonth || [],
          all: data.summary?.all || [],
        });
      } catch (err: any) {
        console.error("Task sidebar error:", err);
        toast.error(err.message || "Tasks load failed");
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, [token]);

  /* ---------------------------------------
     HANDLERS
  ---------------------------------------- */

  const handleRangeSelect = (
    range:
      | "today"
      | "yesterday"
      | "week"
      | "month"
      | "last_month"
      | "all"
      | "custom"
  ) => {
    setActiveRange(range);
    setActiveStatus(null);
    onSelect({ type: "range", value: range });
  };

  const handleStatusSelect = (status: "interested" | "callback") => {
    setActiveStatus(status);
    onSelect({ type: "status", value: status });
  };

  /* ---------------------------------------
     UI
  ---------------------------------------- */

  return (
    <div className="w-full border-r bg-white p-3 space-y-2 text-sm">
      {/* ================= LEADS STATUS ================= */}
      <h2 className="text-xs font-semibold text-gray-600 mb-2">
        LEADS STATUS
      </h2>

      <button
        onClick={() => handleStatusSelect("interested")}
        className={`w-full flex items-center px-3 py-2 rounded text-left ${
          activeStatus === "interested"
            ? "bg-black text-white"
            : "hover:bg-gray-100"
        }`}
      >
        ⭐ Interested Partners
      </button>

      <button
        onClick={() => handleStatusSelect("callback")}
        className={`w-full flex items-center px-3 py-2 rounded text-left ${
          activeStatus === "callback"
            ? "bg-black text-white"
            : "hover:bg-gray-100"
        }`}
      >
        ⏰ Call Back
      </button>

      {/* ================= TASKS ================= */}
      <h2 className="text-xs font-semibold text-gray-600 mt-5 mb-2">
        TASKS
      </h2>

      {loading ? (
        <div className="text-xs text-gray-400">Loading tasks...</div>
      ) : (
        <>
          <button
            onClick={() => handleRangeSelect("today")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded ${
              activeRange === "today" && !activeStatus
                ? "bg-black text-white"
                : "hover:bg-gray-100"
            }`}
          >
            <span>Today</span>
            <span className="text-xs">{summary.today.length}</span>
          </button>

          <button
            onClick={() => handleRangeSelect("yesterday")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded ${
              activeRange === "yesterday" && !activeStatus
                ? "bg-black text-white"
                : "hover:bg-gray-100"
            }`}
          >
            <span>Yesterday</span>
            <span className="text-xs">{summary.yesterday.length}</span>
          </button>

          <button
            onClick={() => handleRangeSelect("week")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded ${
              activeRange === "week" && !activeStatus
                ? "bg-black text-white"
                : "hover:bg-gray-100"
            }`}
          >
            <span>This Week</span>
            <span className="text-xs">{summary.week.length}</span>
          </button>

          <button
            onClick={() => handleRangeSelect("month")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded ${
              activeRange === "month" && !activeStatus
                ? "bg-black text-white"
                : "hover:bg-gray-100"
            }`}
          >
            <span>This Month</span>
            <span className="text-xs">{summary.month.length}</span>
          </button>

          <button
            onClick={() => handleRangeSelect("last_month")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded ${
              activeRange === "last_month" && !activeStatus
                ? "bg-black text-white"
                : "hover:bg-gray-100"
            }`}
          >
            <span>Last Month</span>
            <span className="text-xs">
              {summary.lastMonth?.length || 0}
            </span>
          </button>

          <button
            onClick={() => handleRangeSelect("all")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded ${
              activeRange === "all" && !activeStatus
                ? "bg-black text-white"
                : "hover:bg-gray-100"
            }`}
          >
            <span>Total Leads</span>
            <span className="text-xs">
              {summary.all?.length || 0}
            </span>
          </button>

          <button
            onClick={() => handleRangeSelect("custom")}
            className={`w-full flex items-center px-3 py-2 rounded ${
              activeRange === "custom" && !activeStatus
                ? "bg-black text-white"
                : "hover:bg-gray-100"
            }`}
          >
            📅 Custom Date
          </button>
        </>
      )}
    </div>
  );
}
