"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type PersonType = "investor" | "contributor";

export type PersonPayload = {
  name: string;
  photoUrl: string;
  type: PersonType;
  role: string;
  contribution: string;
  qualifications: string;
  review: string;
  isActive: boolean;
};

export default function PersonForm({
  initialData,
  onSubmit,
  loading,
  ImageUpload,
  token,
}: {
  initialData?: Partial<PersonPayload>;
  onSubmit: (data: PersonPayload) => Promise<void>;
  loading?: boolean;
  ImageUpload: any;
  token?: string;
}) {
  const [form, setForm] = useState<PersonPayload>({
    name: initialData?.name || "",
    photoUrl: initialData?.photoUrl || "",
    type: (initialData?.type as PersonType) || "investor",
    role: initialData?.role || "",
    contribution: initialData?.contribution || "",
    qualifications: initialData?.qualifications || "",
    review: initialData?.review || "",
    isActive: initialData?.isActive ?? true,
  });

  const update = (key: keyof PersonPayload, val: any) =>
    setForm((p) => ({ ...p, [key]: val }));

  const submit = async () => {
    if (!form.name || !form.role || !form.photoUrl) {
      alert("Name, Role and Photo are required");
      return;
    }
    await onSubmit(form);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* PHOTO */}
      <div>
        <label className="block text-sm font-medium mb-1">Profile Photo</label>
        <ImageUpload
          images={form.photoUrl ? [form.photoUrl] : []}
          maxFiles={1}
          token={token}
          onChange={(arr: string[]) => update("photoUrl", arr[0])}
        />
      </div>

      {/* NAME */}
      <div>
        <label className="block text-sm font-medium mb-1">Full Name</label>
        <input
          className="border rounded w-full p-2"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Enter full name"
        />
      </div>

      {/* TYPE */}
      <div>
        <label className="block text-sm font-medium mb-1">Type</label>
        <select
          className="border rounded w-full p-2"
          value={form.type}
          onChange={(e) => update("type", e.target.value as PersonType)}
        >
          <option value="investor">Investor</option>
          <option value="contributor">Contributor</option>
        </select>
      </div>

      {/* ROLE */}
      <div>
        <label className="block text-sm font-medium mb-1">Role</label>
        <input
          className="border rounded w-full p-2"
          value={form.role}
          onChange={(e) => update("role", e.target.value)}
          placeholder="Angel Investor / Sales Contributor"
        />
      </div>

      {/* CONTRIBUTION */}
      <div>
        <label className="block text-sm font-medium mb-1">Contribution</label>
        <textarea
          className="border rounded w-full p-2"
          rows={3}
          value={form.contribution}
          onChange={(e) => update("contribution", e.target.value)}
          placeholder="What contribution did they make?"
        />
      </div>

      {/* QUALIFICATIONS */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Qualifications / Experience
        </label>
        <textarea
          className="border rounded w-full p-2"
          rows={2}
          value={form.qualifications}
          onChange={(e) => update("qualifications", e.target.value)}
          placeholder="MBA, 10+ years experience etc."
        />
      </div>

      {/* REVIEW */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Review / Statement
        </label>
        <textarea
          className="border rounded w-full p-2"
          rows={2}
          value={form.review}
          onChange={(e) => update("review", e.target.value)}
          placeholder="Short quote or feedback"
        />
      </div>

      {/* ACTIVE */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => update("isActive", e.target.checked)}
        />
        <span className="text-sm">Visible on website</span>
      </div>

      {/* SUBMIT */}
      <Button onClick={submit} disabled={loading}>
        {loading ? "Saving..." : "Save Profile"}
      </Button>
    </div>
  );
}
