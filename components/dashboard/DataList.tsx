"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface DataListProps {
  collectionName: string; // users | partners | listings | staffs | etc
  token?: string;
}

export default function DataList({ collectionName }: DataListProps) {
  const [data, setData] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  /* ✅ LOAD FILTERS FROM LOCAL STORAGE */
  useEffect(() => {
    const saved = localStorage.getItem(`filters_${collectionName}`);
    if (saved) {
      try {
        const { search, filterStatus } = JSON.parse(saved);
        setSearch(search || "");
        setFilterStatus(filterStatus || "all");
      } catch {}
    }
  }, [collectionName]);

  /* ✅ LOAD DATA FROM ADMIN API (NO FIRESTORE) */
  async function loadData() {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/admin/data?type=${encodeURIComponent(collectionName)}`,
        { credentials: "include" }
      );

      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to load data");
      }

      setData(data.data || []);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [collectionName]);

  /* ✅ SEARCH + FILTER */
  useEffect(() => {
    let results = [...data];

    if (filterStatus !== "all") {
      results = results.filter(
        (item) =>
          (item.status || "pending").toLowerCase() ===
          filterStatus.toLowerCase()
      );
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      results = results.filter((item) =>
        Object.values(item).join(" ").toLowerCase().includes(term)
      );
    }

    localStorage.setItem(
      `filters_${collectionName}`,
      JSON.stringify({ search, filterStatus })
    );

    setFiltered(results);
  }, [data, search, filterStatus, collectionName]);

  /* ✅ ADMIN ACTIONS (API ONLY) */
  const handleApprove = async (id: string) => {
    const res = await fetch(`/api/admin/data/approve`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionName, id }),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.error || "Approve failed");

    alert("✅ Approved");
    loadData();
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Enter rejection reason");
    if (!reason) return;

    const res = await fetch(`/api/admin/data/reject`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionName, id, reason }),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.error || "Reject failed");

    alert("❌ Rejected");
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this record?")) return;

    const res = await fetch(`/api/admin/data/delete`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionName, id }),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.error || "Delete failed");

    alert("🗑️ Deleted");
    loadData();
  };

  /* ✅ UI */
  if (loading)
    return (
      <p className="text-center py-6 text-gray-500">
        Loading {collectionName}...
      </p>
    );

  if (filtered.length === 0)
    return (
      <div className="text-center py-6 text-gray-500">
        No records found for <b>{collectionName}</b>.
      </div>
    );

  const fields = Object.keys(filtered[0]).slice(0, 4);

  return (
    <div className="max-h-[75vh] overflow-y-auto text-sm">
      {/* CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <h3 className="text-lg font-semibold capitalize">
          {collectionName} ({filtered.length})
        </h3>

        <div className="flex gap-2 items-center">
          <input
            placeholder="🔍 Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border p-2 rounded text-sm"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border p-2 rounded text-sm"
          >
            <option value="all">All</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto border rounded">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              {fields.map((f) => (
                <th key={f} className="p-2 border text-left capitalize">
                  {f}
                </th>
              ))}
              <th className="p-2 border text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                {fields.map((f) => (
                  <td key={f} className="p-2 border">
                    {String(item[f] ?? "—")}
                  </td>
                ))}
                <td className="p-2 border flex gap-2 justify-center">
                  <Button onClick={() => handleApprove(item.id)}>Approve</Button>
                  <Button onClick={() => handleReject(item.id)}>Reject</Button>
                  <Button onClick={() => handleDelete(item.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
