"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

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
};

type Props = {
  token: string; // ✅ Staff JWT token
  onRangeSelect: (range: "today" | "yesterday" | "week" | "month") => void;
};

export default function TaskSidebar({ token, onRangeSelect }: Props) {
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<
    "today" | "yesterday" | "week" | "month"
  >("today");

  const [summary, setSummary] = useState<SummaryResponse>({
    today: [],
    yesterday: [],
    week: [],
    month: [],
  });

  // ✅ FETCH TASK SUMMARY FOR SIDEBAR
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

        if (!data.summary) {
          throw new Error("Invalid task summary response");
        }

        setSummary({
          today: data.summary.today || [],
          yesterday: data.summary.yesterday || [],
          week: data.summary.week || [],
          month: data.summary.month || [],
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

  // ✅ Handle click
  const handleSelect = (
    range: "today" | "yesterday" | "week" | "month"
  ) => {
    setActive(range);
    onRangeSelect(range);
  };

  return (
    <div className="w-full border-r bg-white p-3 space-y-2 text-sm">
      <h2 className="text-xs font-semibold text-gray-600 mb-2">
        TASKS
      </h2>

      {loading ? (
        <div className="text-xs text-gray-400">Loading tasks...</div>
      ) : (
        <>
          {/* ✅ TODAY */}
          <button
            onClick={() => handleSelect("today")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded text-left ${
              active === "today"
                ? "bg-black text-white"
                : "hover:bg-gray-100"
            }`}
          >
            <span>Today</span>
            <span className="text-xs">
              {summary.today.length}
            </span>
          </button>

          {/* ✅ YESTERDAY */}
          <button
            onClick={() => handleSelect("yesterday")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded text-left ${
              active === "yesterday"
                ? "bg-black text-white"
                : "hover:bg-gray-100"
            }`}
          >
            <span>Yesterday</span>
            <span className="text-xs">
              {summary.yesterday.length}
            </span>
          </button>

          {/* ✅ THIS WEEK */}
          <button
            onClick={() => handleSelect("week")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded text-left ${
              active === "week"
                ? "bg-black text-white"
                : "hover:bg-gray-100"
            }`}
          >
            <span>This Week</span>
            <span className="text-xs">
              {summary.week.length}
            </span>
          </button>

          {/* ✅ THIS MONTH */}
          <button
            onClick={() => handleSelect("month")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded text-left ${
              active === "month"
                ? "bg-black text-white"
                : "hover:bg-gray-100"
            }`}
          >
            <span>This Month</span>
            <span className="text-xs">
              {summary.month.length}
            </span>
          </button>
        </>
      )}
    </div>
  );
}
