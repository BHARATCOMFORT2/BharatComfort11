"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { auth } from "@/lib/firebase";

/**
 * PartnerListingsManager - API-driven listing manager with
 * - Drag & drop uploads
 * - Preview, remove
 * - Reorder (native drag/drop)
 * - Mark primary image
 * - Show existing images when editing
 * - Auto-compress images before upload
 * - Max 10 images total
 *
 * Requires these backend endpoints:
 * - POST /api/partners/listings/upload       -> returns { ok: true, url }
 * - POST /api/partners/listings/create       -> returns { success: true, ... }
 * - POST /api/partners/listings/update       -> returns { success: true, ... }
 * - POST /api/partners/listings/delete       -> returns { success: true, ... }
 * - GET  /api/partners/listings/list?page=.. -> returns { ok: true, listings: [...] }
 */

type Listing = {
  id?: string;
  title?: string;
  description?: string;
  location?: string;
  price?: number;
  images?: string[]; // URLs
  allowPayAtHotel?: boolean;
};

type ImageItem =
  | {
      id?: string; // optional for existing images
      url: string; // for existing images or after upload
      isExisting: true;
      file?: File; // not used for existing, present if re-uploaded
      isPrimary?: boolean;
    }
  | {
      id?: string;
      file: File;
      objectUrl?: string;
      isExisting: false;
      url?: string; // set after upload
      isPrimary?: boolean;
    };

export default function PartnerListingsManager() {
  const [token, setToken] = useState<string>("");
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

  // Combined images array (existing + new)
  const [images, setImages] = useState<ImageItem[]>([]);

  // Drag & Drop state
  const dragIndexRef = useRef<number | null>(null);
  const dropIndexRef = useRef<number | null>(null);

  // Max images
  const MAX_IMAGES = 10;

  // On auth ready -> load listings
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) return;
      const t = await u.getIdToken(true);
      setToken(t);
      loadListings(1, t);
    });
    return () => unsub();
  }, []);

  /* -------------------- Helpers -------------------- */

  async function loadListings(pageNum = 1, tk = token) {
    try {
      setLoadBusy(true);
      const res = await fetch(
        `/api/partners/listings/list?page=${pageNum}&limit=20`,
        {
          headers: { Authorization: `Bearer ${tk}` },
        }
      );
      const j = await res.json();
      if (j.ok) {
        if (pageNum === 1) setListings(j.listings || []);
        else setListings((s) => [...s, ...(j.listings || [])]);
        setPage(pageNum);
      } else {
        console.warn("listings load failed", j);
      }
    } catch (err) {
      console.error("loadListings err", err);
    } finally {
      setLoadBusy(false);
    }
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
    // revoke object URLs
    images.forEach((it) => {
      if (!it.isExisting && (it as any).objectUrl) {
        URL.revokeObjectURL((it as any).objectUrl);
      }
    });
    setImages([]);
  }

  /* -------------------- Image Utilities -------------------- */

  // Client-side compress: returns a new File (jpeg) or original file if not image
  async function compressImage(
    file: File,
    maxWidth = 1600,
    quality = 0.8
  ): Promise<File> {
    if (!file.type.startsWith("image/")) return file;

    // Create image bitmap
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

    return await new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const newFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, ".jpg"),
            { type: "image/jpeg" }
          );
          resolve(newFile);
        },
        "image/jpeg",
        quality
      );
    });
  }

  // Upload a single File to your direct upload API -> returns URL
  async function uploadFile(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/partners/listings/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || "Upload failed");
    return j.url as string;
  }

  // Process image items: upload new files, preserve existing URLs, return final array of URLs (ordered)
  async function prepareImageUploadPayload(items: ImageItem[]) {
    const result: string[] = [];
    for (const it of items) {
      if (it.isExisting) {
        result.push(it.url);
      } else {
        // it is a new file
        const file = (it as any).file as File;
        // compress
        const compressed = await compressImage(file, 1600, 0.78);
        const url = await uploadFile(compressed);
        result.push(url);
      }
    }
    return result;
  }

  /* -------------------- Drag & Drop handlers (reorder) -------------------- */

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
    if (from == null || to == null) return;
    if (from === to) return;
    setImages((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
    dragIndexRef.current = null;
    dropIndexRef.current = null;
  }

  /* -------------------- File input / Dropzone -------------------- */

  async function handleFilesSelected(filesList: FileList | null) {
    if (!filesList) return;
    const files = Array.from(filesList);
    // check limit
    const total = images.length + files.length;
    if (total > MAX_IMAGES) {
      alert(
        `You can upload up to ${MAX_IMAGES} images total. Remove some first.`
      );
      return;
    }
    const newItems: ImageItem[] = files.map((f) => ({
      file: f,
      objectUrl: URL.createObjectURL(f),
      isExisting: false,
    }));
    setImages((prev) => [...prev, ...newItems]);
  }

  // Dropzone handlers for file drop
  function handleDropFiles(e: React.DragEvent) {
    e.preventDefault();
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFilesSelected(files);
  }

  /* -------------------- Mark Primary -------------------- */
  function setPrimary(index: number) {
    setImages((prev) =>
      prev.map((it, i) => ({ ...it, isPrimary: i === index }))
    );
  }

  /* -------------------- Remove Image -------------------- */
  function removeImage(index: number) {
    const it = images[index];
    if (!it) return;
    if (!it.isExisting && (it as any).objectUrl) {
      URL.revokeObjectURL((it as any).objectUrl);
    }
    setImages((prev) => {
      const arr = [...prev];
      arr.splice(index, 1);
      // if primary removed, ensure first becomes primary
      const primaryExists = arr.some((x) => x.isPrimary);
      if (!primaryExists && arr.length > 0) arr[0].isPrimary = true;
      return arr;
    });
  }

  /* -------------------- Create / Update / Delete -------------------- */

  async function handleCreateOrUpdate() {
    if (!token) return alert("Auth error");
    if (!form.title.trim()) return alert("Please enter title");
    if (images.length > MAX_IMAGES)
      return alert(`Max ${MAX_IMAGES} images allowed`);

    setBusy(true);
    try {
      // prepare image URLs (this uploads new images)
      const ordered = images; // array of ImageItem
      const urls = await prepareImageUploadPayload(ordered);

      // reorder based on images state; primary image logic: move primary to first position
      const primaryIndex = images.findIndex((i) => i.isPrimary);
      if (primaryIndex > 0) {
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
        const res = await fetch("/api/partners/listings/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: editId, ...payload }),
        });
        const j = await res.json();
        console.log("update response:", j);

        // 🔥 FIX: backend returns `success`, not `ok`
        if (!j.success) throw new Error(j.error || "Update failed");

        alert("Listing updated");
      } else {
        const res = await fetch("/api/partners/listings/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const j = await res.json();
        console.log("create response:", j);

        // 🔥 FIX: backend returns `success`, not `ok`
        if (!j.success) throw new Error(j.error || "Create failed");

        alert("Listing created");
      }

      // reload and reset
      loadListings(1);
      resetForm();
    } catch (err: any) {
      console.error("create/update error", err);
      alert(err.message || "Failed to save listing");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id?: string) {
    if (!id) return;
    if (!confirm("Are you sure you want to delete this listing?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/partners/listings/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });
      const j = await res.json();
      console.log("delete response:", j);

      // 🔥 FIX: backend returns `success`, not `ok`
      if (!j.success) throw new Error(j.error || "Delete failed");

      alert("Listing deleted");
      loadListings(1);
    } catch (err: any) {
      console.error("delete error", err);
      alert(err.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  /* -------------------- Edit existing listing: populate form + images -------------------- */
  function startEdit(l: Listing) {
    setEditId(l.id || null);
    setForm({
      title: l.title || "",
      description: l.description || "",
      location: l.location || "",
      price: (l.price || 0).toString(),
      allowPayAtHotel: l.allowPayAtHotel || false,
    });

    // build images array from existing URLs
    const exImages: ImageItem[] = (l.images || [])
      .slice(0, MAX_IMAGES)
      .map((url, idx) => ({
        id: `${Date.now()}_${idx}`,
        url,
        isExisting: true,
        isPrimary: idx === 0, // assume first is primary
      }));
    setImages(exImages);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* -------------------- UI: image thumbnail component -------------------- */
  function Thumbnail({ it, idx }: { it: ImageItem; idx: number }) {
    const imageUrl = it.isExisting ? (it as any).url : (it as any).objectUrl;
    return (
      <div
        draggable
        onDragStart={(e) => onDragStart(e as any, idx)}
        onDragOver={(e) => onDragOver(e as any, idx)}
        onDrop={onDrop}
        className="relative w-28 h-20 border rounded overflow-hidden"
      >
        <img src={imageUrl} alt="img" className="object-cover w-full h-full" />
        <div className="absolute left-1 top-1 flex gap-1">
          <button
            title="Make primary"
            onClick={() => setPrimary(idx)}
            className={`px-2 py-1 rounded text-xs ${
              it.isPrimary
                ? "bg-yellow-400 text-black"
                : "bg-white/80 text-black"
            }`}
          >
            ★
          </button>
        </div>

        <button
          title="Remove"
          onClick={() => removeImage(idx)}
          className="absolute right-1 top-1 bg-red-600 text-white text-xs px-2 py-1 rounded"
        >
          ✕
        </button>

        <div className="absolute left-1 bottom-1 bg-black/40 text-white text-xs px-1 rounded">
          {idx + 1}
        </div>
      </div>
    );
  }

  /* -------------------- Render -------------------- */
  return (
    <div className="space-y-8">
      {/* Form */}
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

        {/* Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropFiles}
          className="border-dashed border-2 border-gray-200 rounded p-4 text-center"
        >
          <p className="text-sm text-gray-600">
            Drag & drop images here, or
          </p>
          <label className="inline-block mt-2 px-4 py-2 bg-gray-900 text-white rounded cursor-pointer">
            <input
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
            Select files
          </label>
          <p className="text-xs text-gray-500 mt-2">
            Max {MAX_IMAGES} images. New images will be compressed
            automatically.
          </p>
        </div>

        {/* Preview / Gallery */}
        {images.length > 0 && (
          <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-3">
            {images.map((it, i) => (
              <Thumbnail
                key={i + (it.isExisting ? "_e" : "_n")}
                it={it}
                idx={i}
              />
            ))}
          </div>
        )}

        {/* Primary hint */}
        <p className="text-xs text-gray-500 mt-1">
          Click ★ to mark primary (primary image will be shown first).
        </p>

        <label className="flex items-center gap-2 mt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.allowPayAtHotel}
            onChange={(e) =>
              setForm({ ...form, allowPayAtHotel: e.target.checked })
            }
            className="w-5 h-5 accent-green-600"
          />
          <span className="text-sm text-gray-700">Allow Pay at Hotel</span>
        </label>

        <div className="flex gap-2">
          <Button
            onClick={handleCreateOrUpdate}
            className="bg-blue-600 text-white px-6 py-2 rounded"
            disabled={busy}
          >
            {busy
              ? "Saving..."
              : editId
              ? "Update Listing"
              : "Create Listing"}
          </Button>
          <button
            onClick={resetForm}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Listings */}
      <div className="bg-white p-6 rounded-xl shadow border">
        <h2 className="text-xl font-semibold mb-4">Your Listings</h2>

        {loadBusy ? (
          <p>Loading...</p>
        ) : listings.length === 0 ? (
          <p className="text-gray-500">No listings found.</p>
        ) : (
          <div className="space-y-4">
            {listings.map((l) => (
              <div
                key={l.id}
                className="flex justify-between items-center border-b pb-3"
              >
                <div>
                  <h3 className="font-semibold">{l.title}</h3>
                  <p className="text-sm text-gray-600">{l.location}</p>
                  <p className="text-sm text-gray-600">₹{l.price}</p>
                  {l.allowPayAtHotel && (
                    <p className="text-xs text-green-600 mt-1">
                      ✅ Pay at Hotel Enabled
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => startEdit(l)}
                    className="bg-yellow-500 hover:bg-yellow-600"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(l.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}

            <div className="text-center mt-4">
              <Button
                onClick={() => loadListings(page + 1)}
                className="bg-gray-900 text-white"
                disabled={loadBusy}
              >
                {loadBusy ? "Loading..." : "Load More"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
