"use client";

import { useStaffPerformance } from "./useStaffPerformance";

export default function StaffPerformanceModule({
  token,
}: {
  token: string;
}) {
  const { data, loading } = useStaffPerformance(token);

  if (loading) {
    return (
      <div className="bg-white rounded shadow p-4 text-sm text-gray-500">
        Loading performance...
      </div>
    );
  }

  if (!data) return null;

  const conversionRate =
    data.totalLeads > 0
      ? Math.round((data.converted / data.totalLeads) * 100)
      : 0;

  return (
    <div className="bg-white rounded shadow p-4">
      <h3 className="font-semibold mb-3">📊 Performance</h3>

      <div className="grid grid-cols-5 gap-3 text-sm">
        <div>
          <div className="text-gray-500">Leads</div>
          <div className="font-bold">{data.totalLeads}</div>
        </div>

        <div>
          <div className="text-gray-500">Contacted</div>
          <div className="font-bold">{data.contacted}</div>
        </div>

        <div>
          <div className="text-gray-500">Callbacks</div>
          <div className="font-bold">{data.callbacks}</div>
        </div>

        <div>
          <div className="text-gray-500">Converted</div>
          <div className="font-bold">{data.converted}</div>
        </div>

        <div>
          <div className="text-gray-500">Conversion</div>
          <div className="font-bold">{conversionRate}%</div>
        </div>
      </div>
    </div>
  );
}
