"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";

export default function EditListingPage() {
  const router = useRouter();
  const { id } = useParams();
  const [form, setForm] = useState({
    title: "",
    category: "hotel",
    description: "",
    address: "",
    city: "",
    price: "",
    website: "",
  });
  const [images, setImages] = useState<string[]>([]);
  const [progress, setProgress] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storage = getStorage();

  // 🧩 Fetch listing data
  useEffect(() => {
    const fetchListing = async () => {
      try {
        const ref = doc(db, "listings", id as string);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          const user = auth.currentUser;
          if (!user || data.partnerId !== user.uid) throw new Error("Unauthorized access");

          setForm({
            title: data.title || "",
            category: data.category || "hotel",
            description: data.description || "",
            address: data.address || "",
            city: data.city || "",
            price: data.price || "",
            website: data.website || "",
          });
          setImages(data.images || []);
        } else setError("Listing not found");
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchListing();
  }, [id]);

  // 🧩 Handle text input
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm({ ...form, [e.target.name]: e.target.value });

  // 🧩 Upload multiple images
  const handleUploadImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const user = auth.currentUser;
    if (!user) return alert("Please login first.");

    setUploading(true);
    Array.from(files).forEach((file) => {
      const fileRef = ref(storage, `listings/${user.uid}/${Date.now()}-${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress((prev) => ({ ...prev, [file.name]: Math.round(percent) }));
        },
        (error) => console.error("Upload error:", error),
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setImages((prev) => [...prev, url]);
          setUploading(false);
        }
      );
    });
  };

  // 🧩 Delete an existing image
  const handleRemoveImage = async (url: string) => {
    if (!confirm("Remove this image?")) return;
    try {
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
    } catch {
      console.warn("Could not delete file from storage (may not exist)");
    }
    setImages((prev) => prev.filter((img) => img !== url));
  };

  // 🧩 Save changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const ref = doc(db, "listings", id as string);
      await updateDoc(ref, {
        ...form,
        images,
        updatedAt: serverTimestamp(),
        approved: false, // mark pending
      });
      alert("Listing updated successfully!");
      router.push("/partner/listings");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-center py-12">Loading...</p>;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <Card className="shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800">
            Edit Listing
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-red-500 mb-4">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Inputs */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input name="title" value={form.title} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full border rounded p-3"
              >
                <option value="hotel">Hotel</option>
                <option value="restaurant">Restaurant</option>
                <option value="travel">Travel</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                name="description"
                rows={4}
                value={form.description}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input name="address" value={form.address} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label>City</Label>
              <Input name="city" value={form.city} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label>Price</Label>
              <Input name="price" type="number" value={form.price} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label>Website</Label>
              <Input name="website" type="url" value={form.website} onChange={handleChange} />
            </div>

            {/* Images */}
            <div className="space-y-3">
              <Label>Images</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleUploadImages}
              />

              {uploading && (
                <div className="text-sm text-gray-500">
                  {Object.entries(progress).map(([name, val]) => (
                    <p key={name}>
                      {name}: {val}%
                    </p>
                  ))}
                </div>
              )}

              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3">
                  {images.map((url, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={url}
                        alt={`Listing ${i}`}
                        className="w-full h-32 object-cover rounded-lg shadow"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(url)}
                        className="absolute top-1 right-1 bg-black/50 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save */}
            <Button
              type="submit"
              disabled={saving || uploading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
