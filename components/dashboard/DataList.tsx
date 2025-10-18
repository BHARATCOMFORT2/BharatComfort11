"use client";

import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";

/* -------------------------------------------
   DataList Component (Persistent Filters + Search)
-------------------------------------------- */
export default function DataList({ collectionName }: { collectionName: string }) {
  const [data, setData] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  /* Load saved filters */
  useEffect(() => {
    const saved = localStorage.getItem(`filters_${collectionName}`);
    if (saved) {
      const { search: savedSearch, filterStatus: savedFilter } = JSON.parse(saved);
      setSearch(savedSearch || "");
      setFilterStatus(savedFilter || "all");
    }
  }, [collectionName]);

  /* Real-time listener */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, collectionName), (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setData(docs);
      setLoading(false);
    });
    return () => unsub();
  }, [collectionName]);

  /* Search + Filter logic + Persistence */
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
        Object.values(item)
          .join(" ")
          .toLowerCase()
          .includes(term)
      );
    }

    localStorage.setItem(
      `filters_${collectionName}`,
      JSON.stringify({ search, filterStatus })
    );

    setFiltered(results);
  }, [data, search, filterStatus, collectionName]);

  /* Firestore actions */
  const handleApprove = async (id: string) => {
    await updateDoc(doc(db, collectionName, id), { status: "approved" });
    alert("✅ Approved successfully");
  };

  const handleReject = async (id: string) => {
    await updateDoc(doc(db, collectionName, id), { status: "rejected" });
    alert("❌ Rejected");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    await deleteDoc(doc(db, collectionName, id));
    alert("🗑️ Deleted successfully");
  };

  /* Render */
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
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <h3 className="text-lg font-semibold capitalize">
          {collectionName} ({filtered.length})
        </h3>

        <div className="flex gap-2 items-center">
          {/* Search */}
          <input
            type="text"
            placeholder="🔍 Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border p-2 rounded w-40 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
          />

          {/* Filter */}
          {(collectionName === "partners" || collectionName === "listings") && (
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
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg shadow border border-gray-200">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              {fields.map((key) => (
                <th key={key} className="border p-2 capitalize text-left">
                  {key}
                </th>
              ))}
              <th className="border p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition">
                {fields.map((key) => (
                  <td
                    key={key}
                    className="border p-2 truncate max-w-[180px] text-gray-700"
                  >
                    {String(item[key] ?? "—")}
                  </td>
                ))}

                <td className="border p-2 text-center flex gap-2 justify-center">
                  {(collectionName === "partners" ||
                    collectionName === "listings") &&
                    item.status !== "approved" && (
                      <>
                        <Button
                          onClick={() => handleApprove(item.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-xs"
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleReject(item.id)}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 text-xs"
                        >
                          Reject
                        </Button>
                      </>
                    )}

                  <Button
                    onClick={() => handleDelete(item.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs"
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
