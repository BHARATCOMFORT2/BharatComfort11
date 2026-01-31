"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import { Button } from "@/components/ui/Button";

type Person = {
  id: string;
  name: string;
  photoUrl: string;
  type: "investor" | "contributor";
  role: string;
  isActive: boolean;
};

export default function PeopleListPage() {
  const { firebaseUser, profile, loading } = useAuth();
  const router = useRouter();

  const [token, setToken] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [filter, setFilter] = useState<"all" | "investor" | "contributor">(
    "all"
  );
  const [loadingData, setLoadingData] = useState(true);

  /* 🔐 ADMIN PROTECTION */
  useEffect(() => {
    if (loading) return;

    if (!firebaseUser || !["admin", "superadmin"].includes(profile?.role || "")) {
      router.push("/");
      return;
    }

    firebaseUser.getIdToken().then(setToken);
  }, [firebaseUser, profile, loading, router]);

  /* 📥 FETCH PEOPLE */
  useEffect(() => {
    if (!token) return;

    setLoadingData(true);

    fetch("/api/admin/people", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPeople(d.data || []);
      })
      .finally(() => setLoadingData(false));
  }, [token]);

  if (loading || !profile) return <p>Loading...</p>;

  const filtered =
    filter === "all" ? people : people.filter((p) => p.type === filter);

  const toggleStatus = async (id: string, isActive: boolean) => {
    if (!token) return;

    setPeople((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive } : p))
    );

    await fetch("/api/admin/people", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, isActive }),
    });
  };

  return (
    <AdminDashboardLayout
      title="Investors & Contributors"
      profile={profile}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            variant={filter === "investor" ? "default" : "outline"}
            onClick={() => setFilter("investor")}
          >
            Investors
          </Button>
          <Button
            variant={filter === "contributor" ? "default" : "outline"}
            onClick={() => setFilter("contributor")}
          >
            Contributors
          </Button>
        </div>

        <Link href="/admin/dashboard/people/add">
          <Button>➕ Add Person</Button>
        </Link>
      </div>

      {/* TABLE */}
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Photo</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingData && (
              <tr>
                <td colSpan={6} className="p-4 text-center">
                  Loading...
                </td>
              </tr>
            )}

            {!loadingData && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  No records found
                </td>
              </tr>
            )}

            {filtered.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">
                  <img
                    src={p.photoUrl}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                </td>
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3 capitalize">{p.type}</td>
                <td className="p-3">{p.role}</td>
                <td className="p-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={p.isActive}
                      onChange={(e) =>
                        toggleStatus(p.id, e.target.checked)
                      }
                    />
                    <span className="text-xs">
                      {p.isActive ? "Active" : "Hidden"}
                    </span>
                  </label>
                </td>
                <td className="p-3">
                  <Link
                    href={`/admin/dashboard/people/edit/${p.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminDashboardLayout>
  );
}
