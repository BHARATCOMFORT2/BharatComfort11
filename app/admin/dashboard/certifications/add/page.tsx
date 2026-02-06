"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import ImageUpload from "@/components/admin/ImageUpload";
import { Button } from "@/components/ui/Button";

export default function AddCertificatePage() {
  const { firebaseUser } = useAuth();
  const [form, setForm] = useState<any>({
    title: "",
    authority: "",
    certificateUrl: "",
    isActive: true,
    displayOrder: 0,
  });

  const save = async () => {
    if (!firebaseUser) return;
    const token = await firebaseUser.getIdToken();

    await fetch("/api/admin/certifications", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    alert("Saved");
  };

  return (
    <AdminDashboardLayout title="Add Certificate">
      <div className="max-w-xl space-y-4">
        <input
          className="border p-2 w-full"
          placeholder="Certificate Title"
          onChange={e => setForm({ ...form, title: e.target.value })}
        />

        <input
          className="border p-2 w-full"
          placeholder="Issuing Authority"
          onChange={e => setForm({ ...form, authority: e.target.value })}
        />

        <ImageUpload
          images={form.certificateUrl ? [form.certificateUrl] : []}
          maxFiles={1}
          token={firebaseUser?.uid}
          onChange={arr =>
            setForm({ ...form, certificateUrl: arr[0] })
          }
        />

        <Button onClick={save}>Save Certificate</Button>
      </div>
    </AdminDashboardLayout>
  );
}
