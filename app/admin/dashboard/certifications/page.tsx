"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";

export default function CertificationsAdminPage() {
  const { firebaseUser } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!firebaseUser) return;

    firebaseUser.getIdToken().then(async token => {
      const res = await fetch("/api/admin/certifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setItems(data.data);
    });
  }, [firebaseUser]);

  return (
    <AdminDashboardLayout title="Compliance & Certifications">
      <div className="mb-6 flex justify-between">
        <h2 className="text-xl font-semibold">Certificates</h2>
        <Link
          href="/admin/dashboard/certifications/add"
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          + Add Certificate
        </Link>
      </div>

      <div className="space-y-3">
        {items.map(c => (
          <div key={c.id} className="p-4 bg-white rounded shadow">
            <div className="font-medium">{c.title}</div>
            <div className="text-sm text-gray-500">{c.authority}</div>
            <div className="text-xs text-gray-400">
              {c.isActive ? "Visible" : "Hidden"}
            </div>
          </div>
        ))}
      </div>
    </AdminDashboardLayout>
  );
}
