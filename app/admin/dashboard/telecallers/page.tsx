"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import { useAuth } from "@/hooks/useAuth";

type Telecaller = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  isActive: boolean;
};

export default function AdminTelecallersPage() {
  const { firebaseUser, profile, loading } = useAuth();
  const router = useRouter();

  const [token, setToken] = useState("");
  const [telecallers, setTelecallers] = useState<Telecaller[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  /* ✅ ADMIN PROTECTION */
  useEffect(() => {
    if (loading) return;

    if (!firebaseUser || !["admin", "superadmin"].includes(profile?.role || "")) {
      router.push("/");
      return;
    }

    firebaseUser.getIdToken().then((t) => setToken(t));
  }, [firebaseUser, profile, loading, router]);

  /* ✅ LOAD ONLY APPROVED + ACTIVE TELECALLERS */
  useEffect(() => {
    if (!token) return;

    fetch("/api/admin/staff/telecallers", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setTelecallers(d.data || []);
      })
      .finally(() => setPageLoading(false));
  }, [token]);

  if (pageLoading) return <p className="p-6">Loading telecallers...</p>;

  return (
    <AdminDashboardLayout title="Active Telecallers" profile={profile}>
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Active</th>
            </tr>
          </thead>
          <tbody>
            {telecallers.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-3">{t.name}</td>
                <td className="p-3">{t.email}</td>
                <td className="p-3">{t.phone}</td>
                <td className="p-3">{t.role}</td>
                <td className="p-3 capitalize">{t.status}</td>
                <td className="p-3">
                  {t.isActive ? (
                    <span className="text-green-600 font-semibold">Yes</span>
                  ) : (
                    <span className="text-red-600 font-semibold">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!telecallers.length && (
          <p className="p-6 text-center text-gray-500">
            No active telecallers found
          </p>
        )}
      </div>
    </AdminDashboardLayout>
  );
}
