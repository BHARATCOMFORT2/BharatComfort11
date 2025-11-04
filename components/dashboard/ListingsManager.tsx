"use client";

import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDoc,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

/* ----------------------------------------------------
   Listing Interface
---------------------------------------------------- */
interface Listing {
  id?: string;
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
  const { firebaseUser: user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    price: "",
    images: [] as File[],
    allowPayAtHotel: false,
  });
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editId, setEditId] = useState<string | null>(null);

  /* ----------------------------------------------------
     Fetch Role of Logged-In User
  ---------------------------------------------------- */
  useEffect(() => {
    const fetchRole = async () => {
      if (!user?.uid) return;
      const refDoc = doc(db, "users", user.uid);
      const snap = await getDoc(refDoc);
      setUserRole(snap.exists() ? snap.data().role || "partner" : "partner");
    };
    fetchRole();
  }, [user]);

  /* ----------------------------------------------------
     Fetch Listings in Real-time
  ---------------------------------------------------- */
  useEffect(() => {
    if (!user || !userRole) return;

    const q =
      userRole === "admin"
        ? query(collection(db, "listings"), orderBy("createdAt", "desc"))
        : query(
            collection(db, "listings"),
            where("createdBy", "==", user.uid),
            orderBy("createdAt", "desc")
          );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        ...(d.data() as Listing),
        id: d.id,
      }));
      setListings(data);
    });

    return () => unsub();
  }, [user, userRole]);

  /* ----------------------------------------------------
     Upload Images to Firebase Storage
  ---------------------------------------------------- */
  const uploadImages = async (
    files: File[],
    onProgress: (progress: number) => void
  ) => {
    const urls: string[] = [];
    let totalBytes = 0;
    let uploadedBytes = 0;

    files.forEach((f) => (totalBytes += f.size));

    for (const file of files) {
      try {
        const storageRef = ref(storage, `listings/${Date.now()}-${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress =
                ((uploadedBytes + snapshot.bytesTransferred) / totalBytes) * 100;
              onProgress(Math.min(progress, 100));
            },
            (error) => reject(error),
            async () => {
              uploadedBytes += uploadTask.snapshot.totalBytes;
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              urls.push(url);
              resolve();
            }
          );
        });
      } catch (err) {
        console.error("❌ Image upload failed:", err);
        alert(`Image upload failed: ${(err as Error).message}`);
      }
    }

    onProgress(100);
    return urls;
  };

  /* ----------------------------------------------------
     Add or Edit Listing
  ---------------------------------------------------- */
  const handleSubmit = async () => {
    if (!user) return alert("Please login first");

    if (!formData.name || !formData.location || !formData.price)
      return alert("Please fill in all required fields");

    setLoading(true);
    setUploadProgress(0);

    try {
      const newUrls =
        formData.images.length > 0
          ? await uploadImages(formData.images, setUploadProgress)
          : [];

      const mergedImages = [...previewUrls, ...newUrls]; // ✅ Keep old + new

      const data = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        price: Number(formData.price),
        images: mergedImages,
        createdBy: user.uid,
        status: userRole === "admin" ? "approved" : "pending",
        featured: false,
        allowPayAtHotel: formData.allowPayAtHotel, // ✅ NEW FIELD
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (editId) {
        await updateDoc(doc(db, "listings", editId), data);
        alert("✅ Listing updated!");
      } else {
        await addDoc(collection(db, "listings"), data);
        alert("✅ Listing added successfully!");
      }

      // Reset form
      setFormData({
        name: "",
        description: "",
        location: "",
        price: "",
        images: [],
        allowPayAtHotel: false,
      });
      setPreviewUrls([]);
      setUploadProgress(0);
      setEditId(null);
    } catch (err) {
      console.error("🔥 Error saving listing:", err);
      alert(`❌ Failed to save listing: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------
     Delete Listing
  ---------------------------------------------------- */
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this listing?")) return;
    await deleteDoc(doc(db, "listings", id));
  };

  /* ----------------------------------------------------
     Edit Listing
  ---------------------------------------------------- */
  const handleEdit = (listing: Listing) => {
    setEditId(listing.id!);
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
     Approve / Reject (Admin Only)
  ---------------------------------------------------- */
  const handleApprove = async (id: string) => {
    if (userRole !== "admin") return;
    await updateDoc(doc(db, "listings", id), { status: "approved" });
  };

  const handleReject = async (id: string) => {
    if (userRole !== "admin") return;
    await updateDoc(doc(db, "listings", id), { status: "rejected" });
  };

  /* ----------------------------------------------------
     UI Rendering
  ---------------------------------------------------- */
  if (!user)
    return <p className="text-gray-500">Please log in to manage listings.</p>;

  if (!userRole)
    return <p className="text-gray-500">Loading your role...</p>;

  return (
    <div className="mt-10">
      {/* ====== Listing Form ====== */}
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

        {/* ✅ Pay at Hotel toggle */}
        <label className="flex items-center gap-2 col-span-full mt-1 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.allowPayAtHotel}
            onChange={(e) =>
              setFormData({ ...formData, allowPayAtHotel: e.target.checked })
            }
            className="w-5 h-5 accent-green-600"
          />
          <span className="text-sm text-gray-700">
            Allow Pay at Hotel / Restaurant
          </span>
        </label>

        {/* File Upload */}
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

        {/* Show Preview */}
        {previewUrls.length > 0 && (
          <div className="col-span-full flex flex-wrap gap-3 mt-2">
            {previewUrls.map((url, idx) => (
              <div key={idx} className="relative w-24 h-24">
                <img
                  src={url}
                  alt="preview"
                  className="object-cover w-full h-full rounded-md"
                />
              </div>
            ))}
          </div>
        )}

        <div className="col-span-full">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 text-white w-full py-3 rounded-lg mt-3 transition hover:bg-blue-700"
          >
            {loading
              ? uploadProgress < 100
                ? `Uploading ${Math.floor(uploadProgress)}%...`
                : "Processing..."
              : editId
              ? "Update Listing"
              : "Add Listing"}
          </Button>

          {/* 🩵 Progress Bar */}
          {loading && uploadProgress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>

      {/* ====== Listing Cards ====== */}
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
                  <p className="text-sm text-gray-600">{l.location}</p>
                  <p className="text-sm text-gray-600">
                    ₹{l.price} •{" "}
                    <span
                      className={`font-semibold ${
                        l.status === "approved"
                          ? "text-green-600"
                          : l.status === "pending"
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {l.status}
                    </span>
                  </p>
                  {l.allowPayAtHotel && (
                    <p className="text-xs text-green-600 font-medium mt-1">
                      ✅ Pay at Hotel Enabled
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleEdit(l)}
                    className="bg-yellow-500 hover:bg-yellow-600"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(l.id!)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </Button>
                  {userRole === "admin" && (
                    <>
                      <Button
                        onClick={() => handleApprove(l.id!)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReject(l.id!)}
                        className="bg-gray-600 hover:bg-gray-700"
                      >
                        Reject
                      </Button>
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
