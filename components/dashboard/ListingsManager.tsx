"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

/* Drag & Drop */
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ----------------------------------------------------
   Types
---------------------------------------------------- */
interface Listing {
  id: string;
  name: string;
  title?: string;
  description: string;
  location: string;
  price: number;
  images: string[];
  status: "pending" | "approved" | "rejected";
  allowPayAtHotel?: boolean;
}

/* ----------------------------------------------------
   Sortable Image
---------------------------------------------------- */
function SortableImage({ id, url }: { id: string; url: string }) {
  const { setNodeRef, attributes, listeners, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <img
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      src={url}
      style={style}
      className="w-24 h-24 rounded object-cover cursor-move border"
    />
  );
}

/* ----------------------------------------------------
   Listings Manager
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
  const [editId, setEditId] = useState<string | null>(null);

  /* ----------------------------------------------------
     Load Listings (cookie based)
  ---------------------------------------------------- */
  const loadListings = async () => {
    try {
      const res = await fetch("/api/admin/listings", {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);
      setListings(data.listings || []);
    } catch (e: any) {
      alert(e.message || "Failed to load listings");
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  /* ----------------------------------------------------
     Upload Images (Bearer token)
  ---------------------------------------------------- */
  const uploadImages = async (files: File[]) => {
    if (!firebaseUser) throw new Error("Not authenticated");

    const token = await firebaseUser.getIdToken(true);
    const form = new FormData();
    files.forEach((f) => form.append("files", f));

    const res = await fetch("/api/uploads", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Upload failed");
    return data.urls as string[];
  };

  /* ----------------------------------------------------
     Create / Update Listing
  ---------------------------------------------------- */
  const handleSubmit = async () => {
    if (loading || !firebaseUser) {
      alert("Auth loading, please wait");
      return;
    }

    if (
      !formData.name.trim() ||
      !formData.location.trim() ||
      !formData.price ||
      isNaN(Number(formData.price))
    ) {
      alert("Invalid listing data");
      return;
    }

    setBusy(true);

    try {
      const uploaded =
        formData.images.length > 0
          ? await uploadImages(formData.images)
          : [];

      /* 🔑 BACKEND-COMPATIBLE PAYLOAD */
      const payload = {
        id: editId,

        // IMPORTANT: send both
        name: formData.name.trim(),
        title: formData.name.trim(),

        description: formData.description.trim(),
        location: formData.location.trim(),
        price: Number(formData.price),
        images: [...previewUrls, ...uploaded],
        allowPayAtHotel: !!formData.allowPayAtHotel,
      };

      const endpoint = editId
        ? "/api/partners/listings/update"
        : "/api/partners/listings/create";

      const token = await firebaseUser.getIdToken(true);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Operation failed");

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
      loadListings();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  /* ----------------------------------------------------
     Delete Listing
  ---------------------------------------------------- */
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this listing?")) return;
    if (!firebaseUser) return;

    try {
      const token = await firebaseUser.getIdToken(true);

      const res = await fetch("/api/partners/listings/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);

      alert("✅ Listing deleted");
      loadListings();
    } catch (e: any) {
      alert(e.message);
    }
  };

  /* ----------------------------------------------------
     Admin Approve / Reject
  ---------------------------------------------------- */
  const handleApprove = async (id: string) => {
    const res = await fetch("/api/admin/listings/approve", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: id }),
    });
    const data = await res.json();
    if (!res.ok) alert(data?.error);
    else loadListings();
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Enter rejection reason");
    if (!reason) return;

    const res = await fetch("/api/admin/listings/reject", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: id, reason }),
    });
    const data = await res.json();
    if (!res.ok) alert(data?.error);
    else loadListings();
  };

  /* ----------------------------------------------------
     Edit Listing
  ---------------------------------------------------- */
  const handleEdit = (l: Listing) => {
    setEditId(l.id);
    setFormData({
      name: l.name || l.title || "",
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
  if (!firebaseUser) return <p>Please login</p>;

  return (
    <div className="mt-8 space-y-6">
      {/* FORM */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-3">
          {editId ? "Edit Listing" : "Add Listing"}
        </h2>

        <input
          className="border p-2 w-full mb-2"
          placeholder="Name"
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
        />

        <input
          className="border p-2 w-full mb-2"
          placeholder="Location"
          value={formData.location}
          onChange={(e) =>
            setFormData({ ...formData, location: e.target.value })
          }
        />

        <input
          type="number"
          className="border p-2 w-full mb-2"
          placeholder="Price"
          value={formData.price}
          onChange={(e) =>
            setFormData({ ...formData, price: e.target.value })
          }
        />

        <textarea
          className="border p-2 w-full mb-2"
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

        {/* Image Reorder */}
        {previewUrls.length > 0 && (
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={({ active, over }) => {
              if (!over || active.id === over.id) return;
              setPreviewUrls((items) =>
                arrayMove(
                  items,
                  items.indexOf(active.id as string),
                  items.indexOf(over.id as string)
                )
              );
            }}
          >
            <SortableContext items={previewUrls}>
              <div className="flex gap-2 flex-wrap mt-3">
                {previewUrls.map((url) => (
                  <SortableImage key={url} id={url} url={url} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <Button onClick={handleSubmit} disabled={busy}>
          {editId ? "Update Listing" : "Create Listing"}
        </Button>
      </div>

      {/* LISTINGS */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Listings</h2>

        {listings.map((l) => (
          <div
            key={l.id}
            className="flex justify-between items-center border-b py-3"
          >
            <div>
              <strong>{l.name || l.title}</strong>
              <div className="text-sm">{l.location}</div>
              <div className="text-sm">
                ₹{l.price} • {l.status}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => handleEdit(l)}>Edit</Button>
              <Button onClick={() => handleDelete(l.id)}>Delete</Button>

              {profile?.role === "admin" && (
                <>
                  <Button onClick={() => handleApprove(l.id)}>Approve</Button>
                  <Button onClick={() => handleReject(l.id)}>Reject</Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
