"use client";

import { useEffect, useState } from "react";
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
  callbackDate?: string; // ISO string from API
};

type Props = {
  token: string; // ✅ Staff JWT
};

/* ---------------------------------------
   HELPERS
---------------------------------------- */

const isOverdue = (date?: string) => {
  if (!date) return false;
  const today = new Date();
  const cb = new Date(date);
  return cb < today;
};

/* ---------------------------------------
   COMPONENT
---------------------------------------- */

export default function CallbackLeadsPage({ token }: Props) {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);

  /* ---------------------------------------
     FETCH CALLBACK LEADS
  ---------------------------------------- */
  useEffect(() => {
    if (!token) return;

    const loadCallbackLeads = async () => {
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
        toast.error(err.message || "Failed to load call back leads");
      } finally {
        setLoading(false);
      }
    };

    loadCallbackLeads();
  }, [token]);

  /* ---------------------------------------
     UI STATES
  ---------------------------------------- */

  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Loading call back leads...
      </div>
    );
  }

  if (!leads.length) {
    return (
      <div className="p-6 text-sm text-gray-500">
        No call back leads pending 🎉
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold">
        ⏰ Call Back Leads
      </h1>

      <div className="space-y-3">
        {leads.map((lead) => {
          const overdue = isOverdue(lead.callbackDate);

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

                {lead.callbackDate && (
                  <p
                    className={`text-xs mt-1 ${
                      overdue
                        ? "text-red-600 font-semibold"
                        : "text-gray-600"
                    }`}
                  >
                    📅 Call Back:{" "}
                    {new Date(
                      lead.callbackDate
                    ).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div
                className={`text-xs font-semibold ${
                  overdue
                    ? "text-red-600"
                    : "text-orange-600"
                }`}
              >
                {overdue ? "OVERDUE" : "CALL BACK"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
