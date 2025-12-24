"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Telecaller = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  totalCalls: number;
  activeLeads: number;
};

export default function AdminTelecallersPage() {
  const router = useRouter();
  const [data, setData] = useState<Telecaller[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const res = await fetch("/api/admin/telecallers", {
          headers: {
            // 🔒 admin session / token already handled by middleware
          },
        });

        const json = await res.json();
        if (!res.ok || !json.success) throw new Error();

        setData(json.telecallers || []);
      } catch {
        toast.error("Telecallers load failed");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Loading telecallers…
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold">
        Telecallers Dashboard
      </h1>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-center">Total Calls</th>
              <th className="p-2 text-center">Active Leads</th>
              <th className="p-2 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {data.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-2">{t.name || "-"}</td>
                <td className="p-2">{t.email || "-"}</td>
                <td className="p-2 text-center">
                  {t.totalCalls}
                </td>
                <td className="p-2 text-center">
                  {t.activeLeads}
                </td>
                <td className="p-2 text-center">
                  <button
                    onClick={() =>
                      router.push(
                        `/admin/dashboard/telecallers/${t.id}`
                      )
                    }
                    className="text-xs bg-black text-white px-3 py-1"
                  >
                    View Dashboard
                  </button>
                </td>
              </tr>
            ))}

            {data.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-4 text-center text-gray-500"
                >
                  No telecallers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
