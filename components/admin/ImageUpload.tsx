"use client";

import { useState, useRef } from "react";

type ImageUploadProps = {
  images: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  token?: string; // 🔐 MUST be Firebase ID token (JWT)
};

export default function ImageUpload({
  images,
  onChange,
  maxFiles = 5,
  token,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* ============================================================
     🔥 FINAL & SAFE UPLOAD HANDLER
  ============================================================ */
  const handleFiles = async (files: FileList | File[]) => {
    // ❌ Never allow upload without valid JWT
    if (!token || token.length < 100) {
      alert("Authentication expired. Please reload the page.");
      return;
    }

    const validFiles = Array.from(files).slice(
      0,
      Math.max(0, maxFiles - images.length)
    );

    if (!validFiles.length) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    for (const file of validFiles) {
      try {
        const formData = new FormData();

        // ✅ MUST MATCH BACKEND: formData.getAll("files")
        formData.append("files", file);

        const response = await fetch("/api/uploads", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`, // ✅ FULL JWT ONLY
          },
          body: formData,
        });

        const data = await response.json();

        if (!response.ok || !data?.success || !Array.isArray(data.urls)) {
          throw new Error(data?.error || "Upload failed");
        }

        uploadedUrls.push(...data.urls);
      } catch (err: any) {
        console.error("❌ Upload error:", err);
        alert(err.message || "Image upload failed");
      }
    }

    if (uploadedUrls.length > 0) {
      onChange([...images, ...uploadedUrls]);
    }

    setUploading(false);
  };

  return (
    <div className="space-y-3">
      {/* ================= Upload Box ================= */}
      <div
        className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition ${
          dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={maxFiles > 1}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
        <p className="text-sm text-gray-500">
          {uploading ? "Uploading..." : "Drag & drop or click to upload image"}
        </p>
      </div>

      {/* ================= Uploaded Images ================= */}
      <div className="flex flex-wrap gap-3">
        {images.map((url, index) => (
          <div
            key={url}
            className="relative group w-24 h-24 border rounded-lg overflow-hidden"
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragIndex !== null && dragIndex !== index) {
                const reordered = [...images];
                const [moved] = reordered.splice(dragIndex, 1);
                reordered.splice(index, 0, moved);
                onChange(reordered);
                setDragIndex(index);
              }
            }}
            onDragEnd={() => setDragIndex(null)}
          >
            <img src={url} className="object-cover w-full h-full" />
            <button
              type="button"
              onClick={() => onChange(images.filter((i) => i !== url))}
              className="opacity-0 group-hover:opacity-100 absolute top-1 right-1 bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
