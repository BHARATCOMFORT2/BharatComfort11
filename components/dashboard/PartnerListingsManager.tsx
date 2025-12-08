"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { auth } from "@/lib/firebase-client";
import { apiFetch } from "@/lib/apiFetch";

/* -------------------------------- TYPES -------------------------------- */

type Listing = {
  id?: string;
  title?: string;
  description?: string;
  location?: string;
  price?: number;
  images?: string[];
  allowPayAtHotel?: boolean;
};

type ImageItem =
  | {
      id?: string;
      url: string;
      isExisting: true;
      file?: File;
      isPrimary?: boolean;
    }
  | {
      id?: string;
      file: File;
      objectUrl?: string;
      isExisting: false;
      url?: string;
      isPrimary?: boolean;
    };

/* ------------------------------ COMPONENT ------------------------------ */

export default function PartnerListingsManager() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [page] = useState(1);
  const [busy, setBusy] = useState(false);
  const [loadBusy, setLoadBusy] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    price: "",
    allowPayAtHotel: false,
  });

  const [images, setImages] = useState<ImageItem[]>([]);

  const dragIndexRef = useRef<number | null>(null);
  const dropIndexRef = useRef<number | null>(null);

  const MAX_IMAGES = 10;

  /* -------------------- AUTH + LOAD -------------------- */

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) return;
      await u.getIdToken();
      loadListings(1);
    });
    return () => unsub();
  }, []);

  async function loadListings(pageNum = 1) {
    try {
      setLoadBusy(true);
      const res = await apiFetch(
        `/api/partners/listings/list?page=${pageNum}&limit=20`
      );
      const j = await res.json();

      if (j.ok) {
        setListings(j.listings || []);
      }
    } catch (err) {
      console.error("loadListings error:", err);
    } finally {
      setLoadBusy(false);
    }
  }

  /* -------------------- FILE HANDLING -------------------- */

  function handleFilesSelected(filesList: FileList) {
    const files = Array.from(filesList);

    if (images.length + files.length > MAX_IMAGES) {
      alert(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }

    const newItems: ImageItem[] = files.map((f) => ({
      file: f,
      objectUrl: URL.createObjectURL(f),
      isExisting: false,
      isPrimary: false,
    }));

    setImages((prev) => {
      const merged = [...prev, ...newItems];
      if (!merged.some((x) => x.isPrimary)) merged[0].isPrimary = true;
      return merged;
    });
  }

  function removeImage(index: number) {
    const it = images[index];
    if (!it) return;

    if (!it.isExisting && (it as any).objectUrl) {
      URL.revokeObjectURL((it as any).objectUrl);
    }

    setImages((prev) => {
      const arr = [...prev];
      arr.splice(index, 1);
      if (!arr.some((x) => x.isPrimary) && arr.length > 0)
        arr[0].isPrimary = true;
      return arr;
    });
  }

  function setPrimary(index: number) {
    setImages((prev) =>
      prev.map((it, i) => ({ ...it, isPrimary: i === index }))
    );
  }

  /* -------------------- DRAG & DROP -------------------- */

  function onDragStart(e: any, idx: number) {
    dragIndexRef.current = idx;
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: any, idx: number) {
    e.preventDefault();
    dropIndexRef.current = idx;
  }

  function onDrop(e: any) {
    e.preventDefault();
    const from = dragIndexRef.current;
    const to = dropIndexRef.current;
    if (from == null || to == null || from === to) return;

    setImages((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });

    dragIndexRef.current = null;
    dropIndexRef.current = null;
  }

  /* -------------------- UPLOAD -------------------- */

  async function uploadFile(file: File) {
    const fd = new FormData();
    fd.append("file", file);

    const res = await apiFetch("/api/partners/listings/upload", {
      method: "POST",
      body: fd,
    });

    const j = await res.json();
    if (!j.ok) throw new Error(j.error || "Image upload failed");
    return j.url as string;
  }

  async function prepareImageUploadPayload(items: ImageItem[]) {
    const result: string[] = [];

    for (const it of items) {
      if (it.isExisting) {
        result.push(it.url);
      } else {
        const file = (it as any).file as File;
        const url = await uploadFile(file);
        result.push(url);
      }
    }
    return result;
  }

  /* -------------------- CREATE / UPDATE -------------------- */

  async function handleCreateOrUpdate() {
    if (!form.title.trim()) return alert("Enter title");

    setBusy(true);
    try {
      let urls = await prepareImageUploadPayload(images);

      const primaryIndex = images.findIndex((i) => i.isPrimary);
      if (primaryIndex > 0) {
        const p = urls.splice(primaryIndex, 1)[0];
        urls.unshift(p);
      }

      const payload = {
        title: form.title,
        description: form.description,
        location: form.location,
        price: Number(form.price || 0),
        images: urls,
        allowPayAtHotel: form.allowPayAtHotel,
      };

      if (editId) {
        const res = await apiFetch("/api/partners/listings/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editId, ...payload }),
        });

        const j = await res.json();
        if (!j.success) throw new Error(j.error || "Update failed");
        alert("✅ Listing updated");
      } else {
        const res = await apiFetch("/api/partners/listings/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const j = await res.json();
        if (!j.success) throw new Error(j.error || "Create failed");
        alert("✅ Listing created");
      }

      resetForm();
      loadListings(1);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  /* -------------------- DELETE -------------------- */

  async function handleDelete(id?: string) {
    if (!id || !confirm("Delete this listing?")) return;

    setBusy(true);
    try {
      const res = await apiFetch("/api/partners/listings/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const j = await res.json();
      if (!j.success) throw new Error(j.error || "Delete failed");

      alert("✅ Listing deleted");
      loadListings(1);
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  /* -------------------- EDIT -------------------- */

  function startEdit(l: Listing) {
    setEditId(l.id || null);

    setForm({
      title: l.title || "",
      description: l.description || "",
      location: l.location || "",
      price: (l.price || 0).toString(),
      allowPayAtHotel: l.allowPayAtHotel || false,
    });

    const exImages: ImageItem[] = (l.images || []).map((url, idx) => ({
      id: `${idx}`,
      url,
      isExisting: true,
      isPrimary: idx === 0,
    }));

    setImages(exImages);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditId(null);
    setForm({
      title: "",
      description: "",
      location: "",
      price: "",
      allowPayAtHotel: false,
    });
    setImages([]);
  }

  /* -------------------- UI -------------------- */

  return (
    <div className="space-y-8">
      {/* FORM */}
      <div className="bg-white p-6 rounded-xl shadow space-y-4 border">
        <h2 className="text-xl font-semibold">
          {editId ? "Edit Listing" : "Add New Listing"}
        </h2>

        <input
          placeholder="Title"
          className="border p-2 w-full rounded"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        <input
          placeholder="Location"
          className="border p-2 w-full rounded"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />

        <input
          placeholder="Price"
          type="number"
          className="border p-2 w-full rounded"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />

        <textarea
          placeholder="Description"
          className="border p-2 w-full rounded"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) =>
            e.target.files && handleFilesSelected(e.target.files)
          }
        />

        {/* PREVIEW GRID */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            {images.map((it, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={(e) => onDragStart(e, idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDrop={onDrop}
                className="relative border rounded overflow-hidden"
              >
                <img
                  src={it.isExisting ? it.url : (it as any).objectUrl}
                  className="w-full h-24 object-cover"
                />

                <button
                  onClick={() => setPrimary(idx)}
                  className={`absolute left-1 top-1 text-xs px-2 py-1 rounded ${
                    it.isPrimary ? "bg-yellow-400" : "bg-white"
                  }`}
                >
                  ★
                </button>

                <button
                  onClick={() => removeImage(idx)}
                  className="absolute right-1 top-1 bg-red-600 text-white text-xs px-2 py-1 rounded"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            checked={form.allowPayAtHotel}
            onChange={(e) =>
              setForm({ ...form, allowPayAtHotel: e.target.checked })
            }
          />
          Pay at Hotel
        </label>

        <Button onClick={handleCreateOrUpdate} disabled={busy}>
          {busy
            ? "Saving..."
            : editId
            ? "Update Listing"
            : "Create Listing"}
        </Button>
      </div>

      {/* LISTINGS */}
      <div className="bg-white p-6 rounded-xl shadow border">
        <h2 className="text-xl font-semibold mb-4">Your Listings</h2>

        {loadBusy ? (
          <p>Loading...</p>
        ) : listings.length === 0 ? (
          <p>No listings found</p>
        ) : (
          listings.map((l) => (
            <div key={l.id} className="flex justify-between border-b py-2">
              <div>
                <h3>{l.title}</h3>
                <p className="text-sm text-gray-500">{l.location}</p>
                <p>₹{l.price}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => startEdit(l)}>Edit</Button>
                <Button onClick={() => handleDelete(l.id)}>Delete</Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
