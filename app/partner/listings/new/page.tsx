"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";

export default function NewListingPage() {
  const router = useRouter();
  const storage = getStorage();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ [key: string]: number }>({});
  const [imageURLs, setImageURLs] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    location: "",
    price: "",
    description: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleMultipleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const user = auth.currentUser;
    if (!user) {
      alert("Please log in first.");
      return;
    }

    setUploading(true);
    const uploadPromises: Promise<string>[] = [];

    Array.from(files).forEach((file) => {
      const fileRef = ref(
        storage,
        `listings/${user.uid}/${Date.now()}-${file.name}`
      );
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progressPercent =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress((prev) => ({
            ...prev,
            [file.name]: Math.round(progressPercent),
          }));
        },
        (error) => console.error("Upload error:", error),
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          uploadPromises.push(Promise.resolve(downloadURL));
        }
      );
    });

    // Wait for all uploads to finish
    const urls = await Promise.all(uploadPromises);
    setImageURLs((prev) => [...prev, ...urls]);
    setUploading(false);
    alert("All images uploaded successfully!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        alert("You must be logged in to create a listing.");
        router.push("/auth/login");
        return;
      }

      await addDoc(collection(db, "listings"), {
        partnerId: user.uid,
        title: formData.title,
        location: formData.location,
        price: parseFloat(formData.price),
        description: formData.description,
        images: imageURLs,
        approved: false, // pending admin approval
        createdAt: serverTimestamp(),
      });

      alert("Listing created successfully!");
      router.push("/partner/listings");
    } catch (err) {
      console.error("Error creating listing:", err);
      alert("Failed to create listing. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <Card className="shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800">
            Create New Listing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Premium Lakeview Resort"
                required
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Shimla, Himachal Pradesh"
                required
              />
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price">Price per Night (₹)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleChange}
                placeholder="e.g., 2000"
                required
              />
            </div>

            {/* Multiple Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="images">Upload Images (Max 5)</Label>
              <Input
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleMultipleUpload}
              />

              {uploading && (
                <div className="text-sm text-gray-500 mt-2 space-y-1">
                  {Object.entries(progress).map(([name, val]) => (
                    <p key={name}>
                      {name}: {val}%
                    </p>
                  ))}
                </div>
              )}

              {imageURLs.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                  {imageURLs.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Uploaded ${i}`}
                      className="rounded-lg shadow object-cover w-full h-32"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Write a short description about your property..."
                rows={5}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading || uploading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Creating..." : "Create Listing"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
