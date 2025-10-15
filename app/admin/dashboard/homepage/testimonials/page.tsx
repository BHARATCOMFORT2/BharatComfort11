"use client";

import { useEffect, useState } from "react";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

export default function TestimonialsEditor() {
  const [testimonials, setTestimonials] = useState<
    { id?: string; name: string; message: string; imageUrl: string; rating?: number }[]
  >([]);

  const [newTestimonial, setNewTestimonial] = useState({
    name: "",
    message: "",
    imageUrl: "",
    rating: 5,
  });

  const [file, setFile] = useState<File | null>(null);

  // Real-time fetch
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "homepage", "testimonials", "items"),
      (snap) => {
        setTestimonials(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      }
    );
    return () => unsub();
  }, []);

  // Upload image
  const handleImageUpload = async () => {
    if (!file) return "";
    const storageRef = ref(storage, `homepage/testimonials/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  // Add new testimonial
  const handleAdd = async () => {
    if (!newTestimonial.name || !newTestimonial.message) return alert("Fill all fields!");
    const imageUrl = file ? await handleImageUpload() : newTestimonial.imageUrl;
    await addDoc(collection(db, "homepage", "testimonials", "items"), {
      ...newTestimonial,
      imageUrl,
    });
    setNewTestimonial({ name: "", message: "", imageUrl: "", rating: 5 });
    setFile(null);
  };

  // Update existing
  const handleUpdate = async (id: string, updated: any) => {
    await updateDoc(doc(db, "homepage", "testimonials", "items", id), updated);
  };

  // Delete
  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "homepage", "testimonials", "items", id));
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Manage Testimonials / Reviews</h1>

      {/* Add new testimonial */}
      <div className="space-y-2 border-b pb-6">
        <Input
          placeholder="Name"
          value={newTestimonial.name}
          onChange={(e) => setNewTestimonial({ ...newTestimonial, name: e.target.value })}
        />
        <Textarea
          placeholder="Message"
          value={newTestimonial.message}
          onChange={(e) => setNewTestimonial({ ...newTestimonial, message: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Rating (1-5)"
          value={newTestimonial.rating}
          onChange={(e) => setNewTestimonial({ ...newTestimonial, rating: Number(e.target.value) })}
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <Button onClick={handleAdd}>Add Testimonial</Button>
      </div>

      {/* List existing testimonials */}
      <div className="grid gap-6">
        {testimonials.map((t) => (
          <div
            key={t.id}
            className="border p-4 rounded-xl bg-white/50 shadow-sm space-y-2"
          >
            {t.imageUrl && (
              <img
                src={t.imageUrl}
                alt={t.name}
                className="w-24 h-24 object-cover rounded-full"
              />
            )}
            <Input
              value={t.name}
              onChange={(e) => handleUpdate(t.id!, { ...t, name: e.target.value })}
            />
            <Textarea
              value={t.message}
              onChange={(e) => handleUpdate(t.id!, { ...t, message: e.target.value })}
            />
            <Input
              type="number"
              value={t.rating}
              onChange={(e) => handleUpdate(t.id!, { ...t, rating: Number(e.target.value) })}
            />
            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={() => handleDelete(t.id!)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
