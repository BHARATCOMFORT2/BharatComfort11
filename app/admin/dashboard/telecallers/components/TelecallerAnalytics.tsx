"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Props = {
  token: string;
  staffId: string;
};

export default function TelecallerAnalytics({
  token,
  staffId,
}: Props) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `/api/admin/telecallers/${staffId}/analytics`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error();
        setData(json);
      } catch {
        toast.error("Analytics load failed");
      }
    };
    load();
  }, [token, staffId]);

  if (!data) return null;

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-white p-4 rounded shadow">
        <p className="text-xs text-gray-500">Total Calls</p>
        <p className="text-xl font-semibold">
          {data.totalCalls}
        </p>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <p className="text-xs text-gray-500">Total Leads</p>
        <p className="text-xl font-semibold">
          {data.totalLeads}
        </p>
      </div>

      <div className="bg-white p-4 rounded shadow col-span-2">
        <p className="text-xs text-gray-500 mb-1">
          Status Breakdown
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(data.statusCount).map(
            ([k, v]: any) => (
              <span
                key={k}
                className="px-2 py-1 bg-gray-100 rounded"
              >
                {k}: {v}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
