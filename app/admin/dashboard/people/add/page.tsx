"use client";

import { useState } from "react"; // ✅ REQUIRED FIX
import { useRouter } from "next/navigation";

import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import PersonForm, {
  PersonPayload,
} from "@/components/admin/people/PersonForm";
import ImageUpload from "@/components/admin/ImageUpload";

/* ✅ CENTRAL TOKEN HOOK */
import { useAdminToken } from "@/hooks/useAdminToken";

export default function AddPersonPage() {
  const router = useRouter();

  const {
    token,
    ready,
    tokenLoading,
    isAdmin,
  } = useAdminToken();

  const [saving, setSaving] = useState(false);

  /* 🔐 HARD ADMIN GUARD */
  if (tokenLoading) {
    return <p className="p-6 text-sm text-gray-500">Authenticating…</p>;
  }

  if (!isAdmin) {
    router.push("/");
    return null;
  }

  /* 🚀 SUBMIT HANDLER */
  const handleSubmit = async (data: PersonPayload) => {
    if (!token) {
      alert("Authentication expired. Please reload.");
      return;
    }

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
      profile={{ role: "admin" }} // layout ke liye
    >
      <div className="bg-white rounded-lg shadow p-6">
        {ready && (
          <PersonForm
            onSubmit={handleSubmit}
            loading={saving}
            ImageUpload={ImageUpload}
            token={token}
          />
        )}
      </div>
    </AdminDashboardLayout>
  );
}
