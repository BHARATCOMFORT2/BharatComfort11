"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";

type Staff = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  isActive: boolean;
};

export default function AdminStaffPage() {
  const { firebaseUser, profile, loading } = useAuth();
  const router = useRouter();

  const [token, setToken] = useState("");
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  // ✅ ADMIN PROTECTION
  useEffect(() => {
    if (loading) return;

    if (!firebaseUser || !["admin", "superadmin"].includes(profile?.role || "")) {
      router.push("/");
      return;
    }

    firebaseUser.getIdToken().then((t) => setToken(t));
  }, [firebaseUser, profile, loading, router]);

  // ✅ LOAD STAFF LIST
  useEffect(() => {
    if (!token) return;

    fetch("/api/admin/staff/list", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStaffs(d.data || []);
      })
      .finally(() => setPageLoading(false));
  }, [token]);

  // ✅ APPROVE / REJECT STAFF
  const handleAction = async (staffId: string, action: "approve" | "reject") => {
    try {
      const res = await fetch("/api/admin/staff/approve", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ staffId, action }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      toast.success(data.message);

      setStaffs((prev) =>
        prev.map((s) =>
          s.id === staffId
            ? {
                ...s,
                status: action === "approve" ? "approved" : "rejected",
                isActive: action === "approve",
              }
            : s
        )
      );
    } catch (err: any) {
      toast.error(err?.message || "Action failed");
    }
  };

  if (pageLoading) return <p className="p-6">Loading staff...</p>;

  return (
    <AdminDashboardLayout title="Staff Management" profile={profile}>
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {staffs.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3">{s.name}</td>
                <td className="p-3">{s.email}</td>
                <td className="p-3">{s.phone}</td>
                <td className="p-3">{s.role}</td>
                <td className="p-3 capitalize">{s.status}</td>
                <td className="p-3 text-center space-x-2">
                  {s.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleAction(s.id, "approve")}
                        className="px-3 py-1 bg-green-600 text-white rounded"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(s.id, "reject")}
                        className="px-3 py-1 bg-red-600 text-white rounded"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {s.status === "approved" && (
                    <span className="text-green-600 font-semibold">
                      Approved
                    </span>
                  )}

                  {s.status === "rejected" && (
                    <span className="text-red-600 font-semibold">
                      Rejected
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!staffs.length && (
          <p className="p-6 text-center text-gray-500">
            No staff found
          </p>
        )}
      </div>
    </AdminDashboardLayout>
  );
}
