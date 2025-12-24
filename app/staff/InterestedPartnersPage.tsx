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
  updatedAt?: any;
};

type Props = {
  token: string; // ✅ Staff JWT
};

/* ---------------------------------------
   COMPONENT
---------------------------------------- */

export default function InterestedPartnersPage({ token }: Props) {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);

  /* ---------------------------------------
     FETCH INTERESTED LEADS
  ---------------------------------------- */
  useEffect(() => {
    if (!token) return;

    const loadInterestedLeads = async () => {
      try {
        setLoading(true);

        const res = await fetch(
          "/api/staff/leads/by-status?status=interested",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data?.message || "Failed to load leads");
        }

        setLeads(data.leads || []);
      } catch (err: any) {
        console.error("Interested leads error:", err);
        toast.error(err.message || "Failed to load interested partners");
      } finally {
        setLoading(false);
      }
    };

    loadInterestedLeads();
  }, [token]);

  /* ---------------------------------------
     UI
  ---------------------------------------- */

  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Loading interested partners...
      </div>
    );
  }

  if (!leads.length) {
    return (
      <div className="p-6 text-sm text-gray-500">
        No interested partners found.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold">
        ⭐ Interested Partners
      </h1>

      <div className="space-y-3">
        {leads.map((lead) => (
          <div
            key={lead.id}
            className="border rounded p-4 bg-white flex justify-between items-start"
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
            </div>

            <div className="text-xs text-green-600 font-semibold">
              INTERESTED
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
