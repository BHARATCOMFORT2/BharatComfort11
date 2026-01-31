"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import PersonForm, {
  PersonPayload,
} from "@/components/admin/people/PersonForm";

/* reuse your existing uploader */
import ImageUpload from "@/components/admin/ImageUpload";

export default function EditPersonPage() {
  const { id } = useParams<{ id: string }>();
  const { firebaseUser, profile, loading } = useAuth();
  const router = useRouter();

  const [token, setToken] = useState("");
  const [initialData, setInitialData] = useState<PersonPayload | null>(null);
  const [saving, setSaving] = useState(false);
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

  /* 📥 LOAD EXISTING PERSON */
  useEffect(() => {
    if (!token || !id) return;

    setLoadingData(true);

    fetch(`/api/admin/people?id=${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setInitialData(d.data);
        }
      })
      .finally(() => setLoadingData(false));
  }, [token, id]);

  if (loading || !profile || loadingData) return <p>Loading...</p>;

  /* 🚀 UPDATE HANDLER */
  const handleUpdate = async (data: PersonPayload) => {
    if (!token) return;

    try {
      setSaving(true);

      const res = await fetch("/api/admin/people", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, ...data }),
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.message || "Update failed");
      }

      alert("Profile updated successfully");
      router.push("/admin/dashboard/people");
    } catch (err: any) {
      alert(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminDashboardLayout
      title="Edit Investor / Contributor"
      profile={profile}
    >
      <div className="bg-white rounded-lg shadow p-6">
        {initialData && (
          <PersonForm
            initialData={initialData}
            onSubmit={handleUpdate}
            loading={saving}
            ImageUpload={ImageUpload}
            token={token}
          />
        )}
      </div>
    </AdminDashboardLayout>
  );
}
