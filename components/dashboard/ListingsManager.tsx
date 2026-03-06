"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ------------------------------------------------
 TYPES
------------------------------------------------ */

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

interface ImageItem {
  id: string;
  url: string;
  file?: File;
}

/* ------------------------------------------------
 SORTABLE IMAGE
------------------------------------------------ */

function SortableImage({
  image,
  onRemove,
}: {
  image: ImageItem;
  onRemove: (id: string) => void;
}) {
  const { setNodeRef, attributes, listeners, transform, transition } =
    useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div className="relative">
      <img
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        src={image.url}
        style={style}
        className="w-24 h-24 rounded object-cover border cursor-move"
      />

      <button
        onClick={() => onRemove(image.id)}
        className="absolute top-0 right-0 bg-red-600 text-white text-xs px-1 rounded"
      >
        ✕
      </button>
    </div>
  );
}

/* ------------------------------------------------
 LISTINGS MANAGER
------------------------------------------------ */

export default function ListingsManager() {
  const { firebaseUser, profile, loading } = useAuth();

  const [listings, setListings] = useState<Listing[]>([]);
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [images, setImages] = useState<ImageItem[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    price: "",
    allowPayAtHotel: false,
  });

  /* ------------------------------------------------
 LOAD LISTINGS
------------------------------------------------ */

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

  /* ------------------------------------------------
 IMAGE PREVIEW
------------------------------------------------ */

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const newImages: ImageItem[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(file),
      file,
    }));

    setImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  /* ------------------------------------------------
 UPLOAD IMAGES
------------------------------------------------ */

  const uploadImages = async () => {
    const files = images.filter((i) => i.file).map((i) => i.file!);

    if (!files.length) return images.map((i) => i.url);

    const token = await firebaseUser!.getIdToken(true);

    const form = new FormData();

    files.forEach((f) => form.append("files", f));

    const res = await fetch("/api/uploads", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data?.error || "Upload failed");

    return [...images.filter((i) => !i.file).map((i) => i.url), ...data.urls];
  };

  /* ------------------------------------------------
 CREATE / UPDATE
------------------------------------------------ */

  const handleSubmit = async () => {
    if (!firebaseUser) return;

    if (!formData.name || !formData.location || !formData.price) {
      alert("Please fill required fields");
      return;
    }

    setBusy(true);

    try {
      const uploadedImages = await uploadImages();

      const payload = {
        id: editId,
        name: formData.name.trim(),
        title: formData.name.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        price: Number(formData.price),
        images: uploadedImages,
        allowPayAtHotel: formData.allowPayAtHotel,
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

      if (!res.ok) throw new Error(data?.error);

      alert(editId ? "Listing updated" : "Listing created");

      resetForm();

      loadListings();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------------------------
 RESET FORM
------------------------------------------------ */

  const resetForm = () => {
    setEditId(null);

    setImages([]);

    setFormData({
      name: "",
      description: "",
      location: "",
      price: "",
      allowPayAtHotel: false,
    });
  };

  /* ------------------------------------------------
 DELETE
------------------------------------------------ */

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this listing?")) return;

    const token = await firebaseUser!.getIdToken(true);

    const res = await fetch("/api/partners/listings/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id }),
    });

    const data = await res.json();

    if (!res.ok) alert(data?.error);
    else loadListings();
  };

  /* ------------------------------------------------
 EDIT
------------------------------------------------ */

  const handleEdit = (l: Listing) => {
    setEditId(l.id);

    setFormData({
      name: l.name,
      description: l.description,
      location: l.location,
      price: String(l.price),
      allowPayAtHotel: l.allowPayAtHotel || false,
    });

    setImages(
      (l.images || []).map((url) => ({
        id: crypto.randomUUID(),
        url,
      }))
    );
  };

  /* ------------------------------------------------
 ADMIN APPROVAL
------------------------------------------------ */

  const handleApprove = async (id: string) => {
    await fetch("/api/admin/listings/approve", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ listingId: id }),
    });

    loadListings();
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Reject reason");

    if (!reason) return;

    await fetch("/api/admin/listings/reject", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ listingId: id, reason }),
    });

    loadListings();
  };

  /* ------------------------------------------------
 UI
------------------------------------------------ */

  if (!firebaseUser) return <p>Please login</p>;

  return (
    <div className="space-y-8">

      {/* FORM */}

      <div className="bg-white p-6 rounded shadow space-y-3">
        <h2 className="text-xl font-semibold">
          {editId ? "Edit Listing" : "Add Listing"}
        </h2>

        <input
          className="border p-2 w-full"
          placeholder="Name"
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
        />

        <input
          className="border p-2 w-full"
          placeholder="Location"
          value={formData.location}
          onChange={(e) =>
            setFormData({ ...formData, location: e.target.value })
          }
        />

        <input
          type="number"
          className="border p-2 w-full"
          placeholder="Price"
          value={formData.price}
          onChange={(e) =>
            setFormData({ ...formData, price: e.target.value })
          }
        />

        <textarea
          className="border p-2 w-full"
          placeholder="Description"
          value={formData.description}
          onChange={(e) =>
            setFormData({
              ...formData,
              description: e.target.value,
            })
          }
        />

        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {/* IMAGE SORT */}

        {images.length > 0 && (
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={({ active, over }) => {
              if (!over || active.id === over.id) return;

              setImages((items) =>
                arrayMove(
                  items,
                  items.findIndex((i) => i.id === active.id),
                  items.findIndex((i) => i.id === over.id)
                )
              );
            }}
          >
            <SortableContext items={images.map((i) => i.id)}>
              <div className="flex gap-2 flex-wrap mt-3">
                {images.map((img) => (
                  <SortableImage
                    key={img.id}
                    image={img}
                    onRemove={removeImage}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <Button onClick={handleSubmit} disabled={busy}>
          {busy ? "Saving..." : editId ? "Update" : "Create"}
        </Button>
      </div>

      {/* LISTINGS */}

      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Listings</h2>

        {listings.map((l) => (
          <div
            key={l.id}
            className="flex justify-between border-b py-3"
          >
            <div>
              <strong>{l.name}</strong>
              <div>{l.location}</div>
              <div>₹{l.price}</div>
              <div>Status: {l.status}</div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => handleEdit(l)}>Edit</Button>
              <Button onClick={() => handleDelete(l.id)}>Delete</Button>

              {profile?.role === "admin" && (
                <>
                  <Button onClick={() => handleApprove(l.id)}>
                    Approve
                  </Button>

                  <Button onClick={() => handleReject(l.id)}>
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
