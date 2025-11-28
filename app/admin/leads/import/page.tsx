"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function AdminLeadImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select an Excel file");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/leads/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Import failed");
      }

      toast.success("Leads successfully imported!");
      setResult(data);
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error(err?.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Import Leads / Tasks</h1>
          <p className="text-sm text-gray-500">
            Upload Excel file to create telecaller tasks
          </p>
        </div>

        <button
          onClick={() => router.push("/admin/leads")}
          className="text-sm underline"
        >
          ← Back to Leads
        </button>
      </div>

      {/* Upload Card */}
      <div className="bg-white border rounded-xl p-6 max-w-xl">
        <label className="block text-sm font-medium mb-2">
          Excel File (.xlsx)
        </label>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full border rounded px-3 py-2 text-sm"
        />

        <button
          onClick={handleUpload}
          disabled={loading}
          className="mt-4 w-full bg-black text-white rounded py-2 text-sm disabled:opacity-60"
        >
          {loading ? "Importing..." : "Import Leads"}
        </button>
      </div>

      {/* Result Summary */}
      {result && (
        <div className="bg-white border rounded-xl p-6 max-w-xl text-sm space-y-2">
          <h3 className="font-medium">Import Summary</h3>

          <p>Total Rows: {result.total}</p>
          <p className="text-green-600">
            ✅ Successfully Imported: {result.successCount}
          </p>
          <p className="text-red-600">
            ❌ Failed Rows: {result.failedCount}
          </p>

          {result.failedRows?.length > 0 && (
            <div className="mt-2">
              <p className="font-medium text-red-600 mb-1">
                Failed Entries:
              </p>
              <ul className="list-disc ml-5 space-y-1">
                {result.failedRows.map((row: any, i: number) => (
                  <li key={i}>
                    {row.reason} — {JSON.stringify(row.row)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
