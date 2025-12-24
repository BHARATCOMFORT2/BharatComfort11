"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

import CallLogsTab from "@/app/staff/dashboard/components/CallLogsTab";
import TaskSidebar from "@/app/staff/dashboard/components/TaskSidebar";

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
  lastNote?: string;
};

/* ---------------------------------------
   COMPONENT
---------------------------------------- */
export default function AdminTelecallerDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params.staffId as string;

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<
    "tasks" | "interested" | "callback"
  >("tasks");

  const [activeTab, setActiveTab] = useState<
    "tasks" | "calllogs"
  >("tasks");

  const [leads, setLeads] = useState<Lead[]>([]);

  /* ---------------------------------------
     AUTH (ADMIN)
  ---------------------------------------- */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/me");
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error();
        setToken(data.token);
      } catch {
        toast.error("Admin access denied");
        router.push("/admin/login");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  /* ---------------------------------------
     FETCH TELECALLER LEADS
  ---------------------------------------- */
  useEffect(() => {
    if (!token || !staffId) return;

    const loadLeads = async () => {
      try {
        const res = await fetch(
          `/api/admin/telecallers/${staffId}/leads`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error();

        setLeads(data.leads || []);
      } catch {
        toast.error("Leads load failed");
      }
    };

    loadLeads();
  }, [token, staffId]);

  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Loading telecaller dashboard…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[260px_1fr] gap-4 p-4">
      {/* LEFT SIDEBAR (READ ONLY) */}
      <TaskSidebar
        token={token}
        onSelect={(a) => {
          if (a.type === "status") setView(a.value);
          if (a.type === "range") setView("tasks");
        }}
      />

      {/* RIGHT PANEL */}
      <div className="space-y-4">
        {/* TABS */}
        {view === "tasks" && (
          <div className="flex gap-4 border-b pb-2">
            <button
              onClick={() => setActiveTab("tasks")}
              className={`text-sm ${
                activeTab === "tasks"
                  ? "border-b-2 border-black font-medium"
                  : "text-gray-500"
              }`}
            >
              Tasks
            </button>

            <button
              onClick={() => setActiveTab("calllogs")}
              className={`text-sm ${
                activeTab === "calllogs"
                  ? "border-b-2 border-black font-medium"
                  : "text-gray-500"
              }`}
            >
              📞 Call Logs
            </button>
          </div>
        )}

        {/* CALL LOGS */}
        {view === "tasks" && activeTab === "calllogs" && (
          <CallLogsTab token={token} staffId={staffId} />
        )}

        {/* TASKS (READ ONLY TABLE) */}
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
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-t">
                    <td className="p-2">
                      {lead.name || lead.businessName}
                    </td>
                    <td className="p-2">{lead.phone}</td>
                    <td className="p-2">{lead.status}</td>
                    <td className="p-2">
                      {lead.followupDate || "-"}
                    </td>
                    <td className="p-2">
                      {lead.lastNote || "-"}
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-4 text-center text-gray-500"
                    >
                      No leads found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
