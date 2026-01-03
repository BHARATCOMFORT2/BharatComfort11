"use client";

import { useStaffEarnings } from "./useStaffEarnings";

export default function StaffEarningsModule({
  token,
}: {
  token: string;
}) {
  const { data, loading } = useStaffEarnings(token);

  if (loading) {
    return (
      <div className="bg-white rounded shadow p-4 text-sm text-gray-500">
        Loading earnings...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white rounded shadow p-4">
      <h3 className="font-semibold mb-3">💰 Earnings</h3>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="border rounded p-3">
          <div className="text-gray-500">Total</div>
          <div className="font-bold">₹ {data.total}</div>
        </div>

        <div className="border rounded p-3">
          <div className="text-gray-500">This Week</div>
          <div className="font-bold">₹ {data.weekly}</div>
        </div>

        <div className="border rounded p-3">
          <div className="text-gray-500">This Month</div>
          <div className="font-bold">₹ {data.monthly}</div>
        </div>
      </div>

      {data.updatedAt && (
        <div className="text-xs text-gray-400 mt-3">
          Last updated by admin
        </div>
      )}
    </div>
  );
}
