"use client";

import { useState, useRef } from "react";

type ImageUploadProps = {
  images: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  token?: string;
};

export default function ImageUpload({
  images,
  onChange,
  maxFiles = 5,
  token,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = async (files: FileList | File[]) => {
    const valid = Array.from(files).slice(
      0,
      Math.max(0, maxFiles - images.length)
    );
    if (!valid.length) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    for (const file of valid) {
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/uploads", true);
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setProgressMap((prev) => ({ ...prev, [file.name]: percent }));
        }
      };

      const responsePromise = new Promise<{ url?: string; error?: string }>(
        (resolve) => {
          xhr.onload = () => {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              resolve({ error: "Invalid upload response" });
            }
          };
          xhr.onerror = () => resolve({ error: "Network error" });
        }
      );

      xhr.send(formData);

      const { url } = await responsePromise;
      if (url) uploadedUrls.push(url);
    }

    onChange([...images, ...uploadedUrls]);
    setProgressMap({});
    setUploading(false);
  };

  return (
    <div className="space-y-3">
      {/* Upload Box */}
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
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
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
          {uploading
            ? "Uploading..."
            : "Drag & drop or click to upload image"}
        </p>
      </div>

      {/* Upload Progress */}
      {uploading &&
        Object.entries(progressMap).map(([name, percent]) => (
          <div key={name} className="flex gap-2 items-center text-sm">
            <span className="w-20 truncate">{name}</span>
            <div className="flex-1 bg-gray-200 h-2 rounded">
              <div
                className="bg-blue-600 h-2 rounded"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span>{percent}%</span>
          </div>
        ))}

      {/* Uploaded Images */}
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
                const newArr = [...images];
                const [moved] = newArr.splice(dragIndex, 1);
                newArr.splice(index, 0, moved);
                onChange(newArr);
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
