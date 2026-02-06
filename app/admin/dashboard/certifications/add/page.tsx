"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import ImageUpload from "@/components/admin/ImageUpload";
import { Button } from "@/components/ui/Button";

export default function AddCertificatePage() {
  const { firebaseUser, loading, profile } = useAuth();
  const router = useRouter();

  const [token, setToken] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    authority: "",
    certificateUrl: "",
    isActive: true,
    displayOrder: 0,
  });

  /* 🔐 ADMIN TOKEN */
  useEffect(() => {
    if (!firebaseUser || loading) return;

    if (!["admin", "superadmin"].includes(profile?.role || "")) {
      router.push("/");
      return;
    }

    firebaseUser.getIdToken(true).then(setToken);
  }, [firebaseUser, loading, profile, router]);

  /* 🚫 GUARD */
  if (loading || !profile) {
    return <p className="p-6 text-sm text-gray-500">Authenticating…</p>;
  }

  /* 💾 SAVE */
  const save = async () => {
    if (!token) {
      alert("Authentication not ready. Please wait.");
      return;
    }

    if (!form.title || !form.authority || !form.certificateUrl) {
      alert("Title, Authority and Certificate image are required");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/admin/certifications", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to save");
      }

      alert("Certificate saved successfully");
      router.push("/admin/dashboard/certifications");
    } catch (err: any) {
      alert(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminDashboardLayout title="Add Certificate" profile={profile}>
      <div className="max-w-xl space-y-4 bg-white p-6 rounded shadow">

        <input
          className="border p-2 w-full rounded"
          placeholder="Certificate Title"
          value={form.title}
          onChange={(e) =>
            setForm({ ...form, title: e.target.value })
          }
        />

        <input
          className="border p-2 w-full rounded"
          placeholder="Issuing Authority (e.g. Govt of India)"
          value={form.authority}
          onChange={(e) =>
            setForm({ ...form, authority: e.target.value })
          }
        />

        {/* 📷 CERTIFICATE IMAGE */}
        <ImageUpload
          images={form.certificateUrl ? [form.certificateUrl] : []}
          maxFiles={1}
          token={token}   // ✅ CORRECT TOKEN
          onChange={(arr) =>
            setForm({ ...form, certificateUrl: arr[0] || "" })
          }
        />

        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Certificate"}
        </Button>
      </div>
    </AdminDashboardLayout>
  );
}
