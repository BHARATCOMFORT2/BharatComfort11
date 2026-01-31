"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import PersonForm, {
  PersonPayload,
} from "@/components/admin/people/PersonForm";

/* 👇 reuse your existing ImageUpload */
import ImageUpload from "@/components/admin/ImageUpload";

export default function AddPersonPage() {
  const { firebaseUser, profile, loading } = useAuth();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);

  /* 🔐 ADMIN PROTECTION */
  useEffect(() => {
    if (loading) return;

    if (!firebaseUser || !["admin", "superadmin"].includes(profile?.role || "")) {
      router.push("/");
      return;
    }

    firebaseUser.getIdToken().then(setToken);
  }, [firebaseUser, profile, loading, router]);

  if (loading || !profile) return <p>Loading...</p>;

  /* 🚀 SUBMIT HANDLER */
  const handleSubmit = async (data: PersonPayload) => {
    if (!token) return;

    try {
      setSaving(true);

      const res = await fetch("/api/admin/people", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to save");
      }

      alert("Profile added successfully");
      router.push("/admin/dashboard/people");
    } catch (err: any) {
      alert(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminDashboardLayout
      title="Add Investor / Contributor"
      profile={profile}
    >
      <div className="bg-white rounded-lg shadow p-6">
        <PersonForm
          onSubmit={handleSubmit}
          loading={saving}
          ImageUpload={ImageUpload}
          token={token}
        />
      </div>
    </AdminDashboardLayout>
  );
}
