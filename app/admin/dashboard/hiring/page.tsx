"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
} from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2, FileDown, CheckCircle, XCircle, Search } from "lucide-react";
import { Download } from "lucide-react";

export default function HiringAdminPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
// CSV Export Function
const exportToCSV = () => {
  if (applications.length === 0) return;

  const headers = ["Name", "Email", "Phone", "Role", "Experience", "Status", "Created At", "Resume URL"];
  const csvRows = [
    headers.join(","), // header row
    ...applications.map(app =>
      [
        app.name,
        app.email,
        app.phone,
        app.role,
        app.experience,
        app.status,
        new Date(app.createdAt).toLocaleString("en-IN"),
        app.resumeUrl || ""
      ]
        .map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `BHARATCOMFORT11_Hiring_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
};

  useEffect(() => {
    const q = query(collection(db, "applications"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setApplications(apps);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateDoc(doc(db, "applications", id), { status: newStatus });
  };

  // 🔍 Filtered results
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        app.name?.toLowerCase().includes(search.toLowerCase()) ||
        app.email?.toLowerCase().includes(search.toLowerCase()) ||
        app.phone?.toLowerCase().includes(search.toLowerCase());

      const matchesRole = filterRole === "All" || app.role === filterRole;
      const matchesStatus = filterStatus === "All" || app.status === filterStatus;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [applications, search, filterRole, filterStatus]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-6 w-6 text-gray-500" />
      </div>
    );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Job Applications</h1>

      {/* Filters + Search */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        <div className="flex items-center gap-2 w-full md:w-1/3">
          <Search className="w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-4">
          <Select value={filterRole} onValueChange={(v) => setFilterRole(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Roles</SelectItem>
              <SelectItem value="Telecaller">Telecaller</SelectItem>
              <SelectItem value="Marketing">Marketing</SelectItem>
              <SelectItem value="Operations">Operations</SelectItem>
              <SelectItem value="Support">Support</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="shortlisted">Shortlisted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
<div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
  {/* existing filters here */}
  <div className="flex justify-end w-full md:w-auto">
    <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
      <Download className="w-4 h-4" /> Export CSV
    </Button>
  </div>
</div>

      {/* Applications Table */}
      {filteredApps.length === 0 ? (
        <p className="text-gray-500 text-center mt-10">No matching applications.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow-md rounded-xl overflow-hidden">
            <thead className="bg-gray-100 text-gray-700 text-sm uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Experience</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.map((app) => (
                <tr
                  key={app.id}
                  className="border-b text-sm hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-3">{app.name}</td>
                  <td className="px-4 py-3">{app.role}</td>
                  <td className="px-4 py-3">{app.experience}</td>
                  <td className="px-4 py-3">{app.email}</td>
                  <td className="px-4 py-3">{app.phone}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(app.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        app.status === "pending"
                          ? "secondary"
                          : app.status === "shortlisted"
                          ? "success"
                          : "destructive"
                      }
                    >
                      {app.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 flex gap-2 justify-center">
                    {app.resumeUrl ? (
                      <a
                        href={app.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center"
                      >
                        <Button variant="outline" size="sm">
                          <FileDown className="w-4 h-4 mr-1" /> Resume
                        </Button>
                      </a>
                    ) : (
                      <Button variant="ghost" size="sm" disabled>
                        No File
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStatusChange(app.id, "shortlisted")}
                      title="Shortlist"
                    >
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStatusChange(app.id, "rejected")}
                      title="Reject"
                    >
                      <XCircle className="w-4 h-4 text-red-600" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
