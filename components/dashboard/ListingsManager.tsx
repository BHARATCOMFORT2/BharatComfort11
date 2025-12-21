"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

/* ----------------------------------------------------
   Listing Interface
---------------------------------------------------- */
interface Listing {
  id: string;
  name: string;
  description: string;
  location: string;
  price: number;
  images: string[];
  createdBy: string;
  status: "pending" | "approved" | "rejected";
  featured?: boolean;
  allowPayAtHotel?: boolean;
  createdAt?: any;
}

/* ----------------------------------------------------
   Main Component
---------------------------------------------------- */
export default function ListingsManager() {
  const { firebaseUser, profile, loading } = useAuth();

  const [listings, setListings] = useState<Listing[]>([]);
  const [busy, setBusy] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    price: "",
    images: [] as File[],
    allowPayAtHotel: false,
  });

  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editId, setEditId] = useState<string | null>(null);

  /* ----------------------------------------------------
     LOAD LISTINGS (COOKIE BASED)
  ---------------------------------------------------- */
  async function loadListings() {
    try {
      const res = await fetch("/api/admin/listings", {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load listings");
      setListings(data.listings || []);
    } catch (e: any) {
      alert(e.message);
    }
  }

  useEffect(() => {
    loadListings();
  }, []);

  /* ----------------------------------------------------
     🔑 MULTI IMAGE UPLOAD (TOKEN BASED)
  ---------------------------------------------------- */
  const uploadImages = async (files: File[]) => {
    if (!firebaseUser) throw new Error("Not authenticated");

    const token = await firebaseUser.getIdToken(true);
    if (!token) throw new Error("Token missing");

    const form = new FormData();
    files.forEach((f) => form.append("files", f));

    const res = await fetch("/api/uploads", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    const text = await res.text();
    if (!res.ok) throw new Error(text);

    const data = JSON.parse(text);
    return data.urls as string[];
  };

  /* ----------------------------------------------------
     SAVE LISTING
  ---------------------------------------------------- */
  const handleSubmit = async () => {
    if (loading || !firebaseUser) {
      alert("Please wait, auth loading");
      return;
    }

    if (!formData.name || !formData.location || !formData.price) {
      alert("Fill all required fields");
      return;
    }

    setBusy(true);
    setUploadProgress(0);

    try {
      const uploadedUrls =
        formData.images.length > 0
          ? await uploadImages(formData.images)
          : [];

      setUploadProgress(100);

      const payload = {
        id: editId,
        name: formData.name.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        price: Number(formData.price),
        images: [...previewUrls, ...uploadedUrls],
        allowPayAtHotel: formData.allowPayAtHotel,
      };

      const res = await fetch("/api/partner/listings/save", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");

      alert(editId ? "✅ Listing updated" : "✅ Listing created");

      setFormData({
        name: "",
        description: "",
        location: "",
        price: "",
        images: [],
        allowPayAtHotel: false,
      });

      setPreviewUrls([]);
      setEditId(null);
      setUploadProgress(0);
      loadListings();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  /* ----------------------------------------------------
     EDIT
  ---------------------------------------------------- */
  const handleEdit = (l: Listing) => {
    setEditId(l.id);
    setFormData({
      name: l.name,
      description: l.description,
      location: l.location,
      price: String(l.price),
      images: [],
      allowPayAtHotel: l.allowPayAtHotel ?? false,
    });
    setPreviewUrls(l.images || []);
  };

  /* ----------------------------------------------------
     UI
  ---------------------------------------------------- */
  if (!firebaseUser) {
    return <p className="text-gray-500">Please log in.</p>;
  }

  return (
    <div className="mt-10">
      <div className="bg-white shadow p-6 rounded mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {editId ? "Edit Listing" : "Add Listing"}
        </h2>

        <input
          className="border p-2 rounded w-full mb-2"
          placeholder="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />

        <input
          className="border p-2 rounded w-full mb-2"
          placeholder="Location"
          value={formData.location}
          onChange={(e) =>
            setFormData({ ...formData, location: e.target.value })
          }
        />

        <input
          type="number"
          className="border p-2 rounded w-full mb-2"
          placeholder="Price"
          value={formData.price}
          onChange={(e) =>
            setFormData({ ...formData, price: e.target.value })
          }
        />

        <textarea
          className="border p-2 rounded w-full mb-2"
          placeholder="Description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />

        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) =>
            setFormData({
              ...formData,
              images: Array.from(e.target.files || []),
            })
          }
        />

        {previewUrls.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {previewUrls.map((u, i) => (
              <img key={i} src={u} className="w-24 h-24 object-cover rounded" />
            ))}
          </div>
        )}

        <Button onClick={handleSubmit} disabled={busy}>
          {busy
            ? uploadProgress < 100
              ? `Uploading ${uploadProgress}%`
              : "Saving..."
            : editId
            ? "Update Listing"
            : "Add Listing"}
        </Button>
      </div>

      <div className="bg-white shadow p-6 rounded">
        <h2 className="text-xl font-semibold mb-4">Listings</h2>

        {listings.map((l) => (
          <div
            key={l.id}
            className="flex justify-between border-b py-3 items-center"
          >
            <div>
              <strong>{l.name}</strong>
              <div className="text-sm">{l.location}</div>
              <div className="text-sm">₹{l.price} • {l.status}</div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => handleEdit(l)}>Edit</Button>

              {profile?.role === "admin" && (
                <>
                  <Button onClick={() => alert("Approve API")}>Approve</Button>
                  <Button onClick={() => alert("Reject API")}>Reject</Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
