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
   Main Component (API ONLY - NO FIRESTORE CLIENT)
---------------------------------------------------- */
export default function ListingsManager() {
  const { firebaseUser, profile } = useAuth();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);

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
     ✅ LOAD LISTINGS (API ONLY)
  ---------------------------------------------------- */
  async function loadListings() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/listings", {
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load listings");

      setListings(data.listings || []);
    } catch (err: any) {
      console.error("Load listings error:", err);
      alert(err.message || "Failed to load listings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadListings();
  }, []);

  /* ----------------------------------------------------
     ✅ IMAGE UPLOAD (SERVER API)
  ---------------------------------------------------- */
  const uploadImages = async (
    files: File[],
    onProgress: (progress: number) => void
  ) => {
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append("file", files[i]);

      const res = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");

      uploadedUrls.push(data.url);
      onProgress(Math.round(((i + 1) / files.length) * 100));
    }

    return uploadedUrls;
  };

  /* ----------------------------------------------------
     ✅ ADD / UPDATE LISTING (API ONLY)
  ---------------------------------------------------- */
  const handleSubmit = async () => {
    if (!firebaseUser) return alert("Please login first");

    if (!formData.name || !formData.location || !formData.price) {
      return alert("Please fill in all required fields");
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const uploadedUrls =
        formData.images.length > 0
          ? await uploadImages(formData.images, setUploadProgress)
          : [];

      const mergedImages = [...previewUrls, ...uploadedUrls];

      const payload = {
        id: editId,
        name: formData.name.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        price: Number(formData.price),
        images: mergedImages,
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
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to save listing");
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------
     ✅ DELETE LISTING (API ONLY)
  ---------------------------------------------------- */
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this listing?")) return;

    try {
      const res = await fetch("/api/partner/listings/delete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed");

      alert("✅ Listing deleted");
      loadListings();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Delete failed");
    }
  };

  /* ----------------------------------------------------
     ✅ EDIT LISTING (LOCAL ONLY)
  ---------------------------------------------------- */
  const handleEdit = (listing: Listing) => {
    setEditId(listing.id);
    setFormData({
      name: listing.name,
      description: listing.description,
      location: listing.location,
      price: listing.price.toString(),
      images: [],
      allowPayAtHotel: listing.allowPayAtHotel ?? false,
    });

    setPreviewUrls(listing.images || []);
  };

  /* ----------------------------------------------------
     ✅ ADMIN APPROVE (API)
  ---------------------------------------------------- */
  const handleApprove = async (id: string) => {
    try {
      const res = await fetch("/api/admin/listings/approve", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Approval failed");

      alert("✅ Listing approved");
      loadListings();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Approval failed");
    }
  };

  /* ----------------------------------------------------
     ✅ ADMIN REJECT (API)
  ---------------------------------------------------- */
  const handleReject = async (id: string) => {
    const reason = prompt("Enter rejection reason");
    if (!reason) return;

    try {
      const res = await fetch("/api/admin/listings/reject", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: id, reason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Rejection failed");

      alert("❌ Listing rejected");
      loadListings();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Rejection failed");
    }
  };

  /* ----------------------------------------------------
     UI
  ---------------------------------------------------- */
  if (!firebaseUser)
    return <p className="text-gray-500">Please log in to manage listings.</p>;

  return (
    <div className="mt-10">
      {/* ====== FORM ====== */}
      <div className="grid md:grid-cols-2 gap-4 mb-6 bg-white shadow p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-3 col-span-full">
          {editId ? "Edit Listing" : "Add New Listing"}
        </h2>

        <input
          placeholder="Name"
          className="border p-2 rounded"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />

        <input
          placeholder="Location"
          className="border p-2 rounded"
          value={formData.location}
          onChange={(e) =>
            setFormData({ ...formData, location: e.target.value })
          }
        />

        <input
          placeholder="Price"
          type="number"
          className="border p-2 rounded"
          value={formData.price}
          onChange={(e) =>
            setFormData({ ...formData, price: e.target.value })
          }
        />

        <textarea
          placeholder="Description"
          className="border p-2 rounded col-span-full"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />

        <label className="flex items-center gap-2 col-span-full mt-1 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.allowPayAtHotel}
            onChange={(e) =>
              setFormData({ ...formData, allowPayAtHotel: e.target.checked })
            }
          />
          <span className="text-sm">
            Allow Pay at Hotel / Restaurant
          </span>
        </label>

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
          <div className="col-span-full flex flex-wrap gap-3 mt-2">
            {previewUrls.map((url, idx) => (
              <img
                key={idx}
                src={url}
                className="w-24 h-24 rounded object-cover"
              />
            ))}
          </div>
        )}

        <div className="col-span-full">
          <Button onClick={handleSubmit} disabled={loading}>
            {loading
              ? uploadProgress < 100
                ? `Uploading ${uploadProgress}%`
                : "Processing..."
              : editId
              ? "Update Listing"
              : "Add Listing"}
          </Button>
        </div>
      </div>

      {/* ====== LISTINGS ====== */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Your Listings</h2>

        {listings.length === 0 ? (
          <p className="text-gray-500">No listings found.</p>
        ) : (
          <div className="space-y-4">
            {listings.map((l) => (
              <div
                key={l.id}
                className="flex justify-between items-center border-b pb-3"
              >
                <div>
                  <h3 className="font-semibold">{l.name}</h3>
                  <p className="text-sm">{l.location}</p>
                  <p className="text-sm">₹{l.price} • {l.status}</p>
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
        )}
      </div>
    </div>
  );
}
