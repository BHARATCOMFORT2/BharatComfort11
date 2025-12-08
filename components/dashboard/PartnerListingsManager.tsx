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
  const [page, setPage] = useState(1);
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

  /* -------------------- Load Listings -------------------- */

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) return;
      await u.getIdToken(); // ensure session cookie
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
        if (pageNum === 1) setListings(j.listings || []);
        else setListings((s) => [...s, ...(j.listings || [])]);
        setPage(pageNum);
      } else {
        console.warn("Listings load failed:", j);
      }
    } catch (err) {
      console.error("loadListings error:", err);
    } finally {
      setLoadBusy(false);
    }
  }

  /* -------------------- Reset Form -------------------- */

  function resetForm() {
    setEditId(null);
    setForm({
      title: "",
      description: "",
      location: "",
      price: "",
      allowPayAtHotel: false,
    });

    images.forEach((it) => {
      if (!it.isExisting && (it as any).objectUrl) {
        URL.revokeObjectURL((it as any).objectUrl);
      }
    });
    setImages([]);
  }

  /* -------------------- Image Helpers -------------------- */

  async function compressImage(file: File, maxWidth = 1600, quality = 0.8) {
    if (!file.type.startsWith("image/")) return file;

    const imgBitmap = await createImageBitmap(file);
    const ratio = imgBitmap.width / imgBitmap.height;
    const width = Math.min(maxWidth, imgBitmap.width);
    const height = Math.round(width / ratio);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(imgBitmap, 0, 0, width, height);

    return await new Promise<File>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          resolve(
            new File(
              [blob],
              file.name.replace(/\.[^.]+$/, ".jpg"),
              { type: "image/jpeg" }
            )
          );
        },
        "image/jpeg",
        quality
      );
    });
  }

  async function uploadFile(file: File) {
    const fd = new FormData();
    fd.append("file", file);

    const res = await apiFetch("/api/partners/listings/upload", {
      method: "POST",
      body: fd,
    });

    const j = await res.json();
    if (!j.ok) throw new Error(j.error || "Upload failed");
    return j.url as string;
  }

  async function prepareImageUploadPayload(items: ImageItem[]) {
    const result: string[] = [];
    for (const it of items) {
      if (it.isExisting) {
        result.push(it.url);
      } else {
        const file = (it as any).file as File;
        const compressed = await compressImage(file);
        const url = await uploadFile(compressed);
        result.push(url);
      }
    }
    return result;
  }

  /* -------------------- Drag & Drop -------------------- */

  function onDragStart(e: React.DragEvent, idx: number) {
    dragIndexRef.current = idx;
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    dropIndexRef.current = idx;
    e.dataTransfer.dropEffect = "move";
  }

  function onDrop(e: React.DragEvent) {
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

  /* -------------------- File Selection -------------------- */

  function handleFilesSelected(filesList: FileList | null) {
    if (!filesList) return;

    const files = Array.from(filesList);
    if (images.length + files.length > MAX_IMAGES) {
      alert(`Max ${MAX_IMAGES} images allowed`);
      return;
    }

    const newItems: ImageItem[] = files.map((f) => ({
      file: f,
      objectUrl: URL.createObjectURL(f),
      isExisting: false,
    }));

    setImages((prev) => [...prev, ...newItems]);
  }

  function handleDropFiles(e: React.DragEvent) {
    e.preventDefault();
    handleFilesSelected(e.dataTransfer.files);
  }

  function setPrimary(index: number) {
    setImages((prev) =>
      prev.map((it, i) => ({ ...it, isPrimary: i === index }))
    );
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
      if (!arr.some((x) => x.isPrimary) && arr.length > 0) {
        arr[0].isPrimary = true;
      }
      return arr;
    });
  }

  /* -------------------- Create / Update -------------------- */

  async function handleCreateOrUpdate() {
    if (!form.title.trim()) return alert("Enter title");

    setBusy(true);
    try {
      const urls = await prepareImageUploadPayload(images);

      const primaryIndex = images.findIndex((i) => i.isPrimary);
      if (primaryIndex >= 0) {
        const u = urls.splice(primaryIndex, 1)[0];
        urls.unshift(u);
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
          body: JSON.stringify({ id: editId, ...payload }),
        });

        const j = await res.json();
        if (!j.success) throw new Error(j.error || "Update failed");
        alert("Listing updated");
      } else {
        const res = await apiFetch("/api/partners/listings/create", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        const j = await res.json();
        if (!j.success) throw new Error(j.error || "Create failed");
        alert("Listing created");
      }

      loadListings(1);
      resetForm();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id?: string) {
    if (!id || !confirm("Delete this listing?")) return;

    setBusy(true);
    try {
      const res = await apiFetch("/api/partners/listings/delete", {
        method: "POST",
        body: JSON.stringify({ id }),
      });

      const j = await res.json();
      if (!j.success) throw new Error(j.error || "Delete failed");

      alert("Listing deleted");
      loadListings(1);
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

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

  /* -------------------- UI -------------------- */

  return (
    <div className="space-y-8">
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

        <label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
        </label>

        <Button onClick={handleCreateOrUpdate} disabled={busy}>
          {busy
            ? "Saving..."
            : editId
            ? "Update Listing"
            : "Create Listing"}
        </Button>
      </div>

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
