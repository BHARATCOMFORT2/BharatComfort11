"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

/* ---------------------------------------
   TYPES
---------------------------------------- */
type Lead = {
  id: string;
  name?: string;
  businessName?: string;
  mobile?: string;
  city?: string;
  status?: string;
  followupDate?: string;
};

type Props = {
  token: string;
};

/* ---------------------------------------
   DATE HELPERS
---------------------------------------- */
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isOverdue = (date?: string) => {
  if (!date) return false;
  return new Date(date) < new Date(new Date().toDateString());
};

const isToday = (date?: string) => {
  if (!date) return false;
  return isSameDay(new Date(date), new Date());
};

const isTomorrow = (date?: string) => {
  if (!date) return false;
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return isSameDay(new Date(date), t);
};

/* ---------------------------------------
   COMPONENT
---------------------------------------- */
export default function CallbackLeadsPage({ token }: Props) {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<
    "all" | "today" | "tomorrow" | "overdue"
  >("all");

  /* ---------------------------------------
     FETCH CALLBACK LEADS
  ---------------------------------------- */
  useEffect(() => {
    // 🔥 FIX: token nahi hai to loading band karo
    if (!token) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);

        const res = await fetch(
          "/api/staff/leads/by-status?status=callback",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data?.message || "Failed to load callback leads");
        }

        setLeads(data.leads || []);
      } catch (err: any) {
        console.error("Callback leads error:", err);
        toast.error(err.message || "Failed to load callback leads");
      } finally {
        setLoading(false); // 🔥 GUARANTEED EXIT
      }
    };

    load();
  }, [token]);

  /* ---------------------------------------
     AUTO REMINDER
  ---------------------------------------- */
  useEffect(() => {
    if (!leads.length) return;

    const overdueCount = leads.filter((l) =>
      isOverdue(l.followupDate)
    ).length;

    const todayCount = leads.filter((l) =>
      isToday(l.followupDate)
    ).length;

    if (overdueCount > 0) {
      toast.error(`⚠️ ${overdueCount} callback overdue`);
    } else if (todayCount > 0) {
      toast(`⏰ ${todayCount} callbacks scheduled today`);
    }
  }, [leads]);

  /* ---------------------------------------
     FILTERED LEADS
  ---------------------------------------- */
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (filter === "today") return isToday(l.followupDate);
      if (filter === "tomorrow") return isTomorrow(l.followupDate);
      if (filter === "overdue") return isOverdue(l.followupDate);
      return true;
    });
  }, [leads, filter]);

  /* ---------------------------------------
     CALLBACK COMPLETE
  ---------------------------------------- */
  const markCompleted = async (leadId: string) => {
    try {
      const res = await fetch("/api/staff/leads/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          leadId,
          status: "contacted",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error();
      }

      setLeads((p) => p.filter((l) => l.id !== leadId));
      toast.success("Callback completed");
    } catch {
      toast.error("Failed to complete callback");
    }
  };

  /* ---------------------------------------
     UI STATES
  ---------------------------------------- */
  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Loading callback leads...
      </div>
    );
  }

  if (!leads.length) {
    return (
      <div className="p-6 text-sm text-gray-500">
        No callback leads 🎉
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold">⏰ Callback Leads</h1>

      {/* FILTER BAR */}
      <div className="flex gap-2 text-xs">
        {["all", "today", "tomorrow", "overdue"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-3 py-1 rounded border ${
              filter === f
                ? "bg-black text-white"
                : "bg-white"
            }`}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* LIST */}
      <div className="space-y-3">
        {filteredLeads.map((lead) => {
          const overdue = isOverdue(lead.followupDate);

          return (
            <div
              key={lead.id}
              className={`border rounded p-4 bg-white flex justify-between items-start ${
                overdue ? "border-red-400 bg-red-50" : ""
              }`}
            >
              <div>
                <p className="font-medium">
                  {lead.businessName || lead.name}
                </p>

                {lead.city && (
                  <p className="text-xs text-gray-500">
                    📍 {lead.city}
                  </p>
                )}

                {lead.mobile && (
                  <p className="text-xs text-gray-500">
                    📞 {lead.mobile}
                  </p>
                )}

                {lead.followupDate && (
                  <p
                    className={`text-xs mt-1 ${
                      overdue
                        ? "text-red-600 font-semibold"
                        : "text-gray-600"
                    }`}
                  >
                    📅 Call Back:{" "}
                    {new Date(
                      lead.followupDate
                    ).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <span
                  className={`text-xs font-semibold ${
                    overdue
                      ? "text-red-600"
                      : "text-orange-600"
                  }`}
                >
                  {overdue ? "OVERDUE" : "CALL BACK"}
                </span>

                <button
                  onClick={() => markCompleted(lead.id)}
                  className="text-xs px-3 py-1 bg-green-600 text-white rounded"
                >
                  ✔ Complete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
