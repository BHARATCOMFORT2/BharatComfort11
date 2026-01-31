"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  investmentRange: string;
  status: string;
};

export default function InvestorLeadsPage() {
  const { firebaseUser, profile, loading } = useAuth();
  const router = useRouter();

  const [token, setToken] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser || profile?.role !== "admin") {
      router.push("/");
      return;
    }
    firebaseUser.getIdToken().then(setToken);
  }, [firebaseUser, profile, loading, router]);

  useEffect(() => {
    if (!token) return;

    fetch("/api/admin/investor-leads", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => d.success && setLeads(d.data));
  }, [token]);

  return (
    <AdminDashboardLayout title="Investor Leads" profile={profile}>
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Range</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3">{l.name}</td>
                <td className="p-3">{l.email}</td>
                <td className="p-3">{l.phone}</td>
                <td className="p-3">{l.investmentRange}</td>
                <td className="p-3 capitalize">{l.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminDashboardLayout>
  );
}
