"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";

type ActivityItem = {
  id: string;
  type: string;
  staffId?: string;
  leadId: string;
  leadName?: string;
  text?: string;
  outcome?: string;
  status?: string;
  createdAt: string;
  meta?: any;
};

export default function StaffActivityPage() {
  const params = useParams();
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const staffId = params?.id as string;

  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [types, setTypes] = useState<{[k:string]:boolean}>({ note:true, call:true, status:true, log:true });
  const [search, setSearch] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [limit] = useState(50);

  useEffect(() => {
    if (!firebaseUser) return;
    fetchPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser]);

  const fetchPage = async (fresh = false) => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const token = await firebaseUser.getIdToken();
      const body: any = { staffId, limit };
      if (from) body.from = from;
      if (to) body.to = to;
      body.types = Object.keys(types).filter(k => types[k]);
      if (search) body.search = search;
      if (!fresh && nextCursor) body.cursor = nextCursor;

      const res = await fetch("/api/admin/staff/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.message || "Failed");

      if (fresh) {
        setItems(json.items || []);
      } else {
        setItems(prev => [...prev, ...(json.items || [])]);
      }
      setNextCursor(json.nextCursor || null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Activity load failed");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!firebaseUser) return;
    try {
      const token = await firebaseUser.getIdToken();
      const body: any = { staffId };
      if (from) body.from = from;
      if (to) body.to = to;
      body.types = Object.keys(types).filter(k => types[k]);
      if (search) body.search = search;

      // open export route in new tab to download
      const res = await fetch("/api/admin/staff/activity/export", {
        method: "POST",
        headers: { "Content-Type":"application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const j = await res.json().catch(()=>({}));
        throw new Error(j?.message || "Export failed");
      }

      // get blob and download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = `staff-${staffId}-activity.csv`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Export started");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Export failed");
    }
  };

  const toggleType = (t: string) => setTypes(prev => ({ ...prev, [t]: !prev[t] }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Staff Activity</h1>
          <p className="text-sm text-gray-500">Timeline for staff ID: {staffId}</p>
        </div>

        <div className="flex gap-2">
          <button onClick={() => router.back()} className="px-3 py-1 border rounded">Back</button>
          <button onClick={handleExport} className="px-3 py-1 bg-gray-800 text-white rounded">Export CSV</button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 rounded flex flex-wrap gap-3 items-center">
        <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="border px-2 py-1 text-sm" />
        <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} className="border px-2 py-1 text-sm" />

        <input placeholder="Search text / lead name" className="border px-2 py-1 text-sm w-64" value={search} onChange={(e)=>setSearch(e.target.value)} />

        <div className="flex gap-2 items-center">
          <label className="text-xs"><input type="checkbox" checked={types.note} onChange={()=>toggleType("note")} /> Note</label>
          <label className="text-xs"><input type="checkbox" checked={types.call} onChange={()=>toggleType("call")} /> Call</label>
          <label className="text-xs"><input type="checkbox" checked={types.status} onChange={()=>toggleType("status")} /> Status</label>
          <label className="text-xs"><input type="checkbox" checked={types.log} onChange={()=>toggleType("log")} /> Log</label>
        </div>

        <div className="ml-auto flex gap-2">
          <button onClick={()=>fetchPage(true)} className="px-3 py-1 border rounded">Apply</button>
          <button onClick={()=>{ setFrom(""); setTo(""); setSearch(""); setTypes({note:true,call:true,status:true,log:true}); fetchPage(true); }} className="px-3 py-1 border rounded">Reset</button>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded shadow p-4 space-y-3">
        {loading && items.length === 0 ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-gray-500">No activity found.</div>
        ) : (
          <div className="space-y-3">
            {items.map(it => (
              <div key={it.id} className="border rounded p-3">
                <div className="flex items-start justify-between">
                  <div className="text-sm font-medium">{it.leadName || it.leadId}</div>
                  <div className="text-xs text-gray-500">{new Date(it.createdAt).toLocaleString()}</div>
                </div>

                <div className="text-xs text-gray-700 mt-1">
                  <strong className="capitalize">{it.type}</strong>
                  {it.status && <span className="ml-2">Status: {it.status}</span>}
                  {it.outcome && <span className="ml-2">Outcome: {it.outcome}</span>}
                </div>

                {it.text && <div className="mt-2 text-sm whitespace-pre-wrap">{it.text}</div>}

                <div className="mt-2 text-[11px] text-gray-500">Meta: {JSON.stringify(it.meta || {})}</div>
              </div>
            ))}
          </div>
        )}

        {nextCursor && (
          <div className="text-center">
            <button onClick={()=>fetchPage(false)} className="px-4 py-2 bg-gray-100 rounded">Load more</button>
          </div>
        )}
      </div>
    </div>
  );
}
