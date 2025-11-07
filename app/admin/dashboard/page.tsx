"use client";

import { useState, useEffect, useRef, DragEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Modal from "@/components/home/Modal";
import ListingsManager from "@/components/dashboard/ListingsManager";
import { Button } from "@/components/ui/Button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import DataList from "@/components/dashboard/DataList";

/* ============================================================
   🖼️ Advanced Image Upload (Multiple + Drag-Drop + Reorder)
============================================================ */
type ImageUploadProps = {
  images: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
};

const ImageUpload: React.FC<ImageUploadProps> = ({ images, onChange, maxFiles = 5 }) => {
  const [uploading, setUploading] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).slice(0, maxFiles - images.length);
    if (validFiles.length === 0) return;
    setUploading(true);
    const uploadedUrls: string[] = [];

    for (const file of validFiles) {
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/uploads", true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgressMap((prev) => ({ ...prev, [file.name]: percent }));
        }
      };

      const responsePromise = new Promise<{ url?: string; error?: string }>((resolve) => {
        xhr.onload = () => {
          try {
            const res = JSON.parse(xhr.responseText);
            resolve(res);
          } catch {
            resolve({ error: "Invalid response" });
          }
        };
        xhr.onerror = () => resolve({ error: "Upload failed" });
      });

      xhr.send(formData);
      const { url } = await responsePromise;
      if (url) uploadedUrls.push(url);
    }

    onChange([...images, ...uploadedUrls]);
    setProgressMap({});
    setUploading(false);
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(e.target.files);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length) handleFiles(files);
  };

  const removeImage = (url: string) => {
    onChange(images.filter((img) => img !== url));
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const updated = [...images];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition ${
          dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={uploading || images.length >= maxFiles}
          onChange={handleFileInput}
          className="hidden"
        />
        <p className="text-sm text-gray-500 text-center">
          {uploading ? "Uploading..." : "Drag & drop or click to upload images"}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Supports JPG, PNG, WEBP — max {maxFiles} images
        </p>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-1">
          {Object.entries(progressMap).map(([filename, percent]) => (
            <div key={filename} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="truncate w-24">{filename}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span>{percent}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Image Grid with Reordering */}
      <div className="flex flex-wrap gap-3">
        {images.map((url, index) => (
          <div
            key={url}
            className="relative w-24 h-24 border rounded-lg overflow-hidden group"
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragIndex !== null && dragIndex !== index) {
                handleReorder(dragIndex, index);
                setDragIndex(index);
              }
            }}
            onDragEnd={() => setDragIndex(null)}
          >
            <img src={url} alt="uploaded" className="object-cover w-full h-full" />
            <button
              onClick={() => removeImage(url)}
              className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================
   🧩 Homepage Section Editor
============================================================ */
type SectionEditorProps = {
  sectionId: string;
  token: string;
};

const SectionEditor: React.FC<SectionEditorProps> = ({ sectionId, token }) => {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSection = async () => {
      const res = await fetch(`/api/admin/homepage?section=${sectionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.section) {
        setTitle(data.section.title || "");
        setSubtitle(data.section.subtitle || "");
        setImages(data.section.images || []);
      }
      setLoading(false);
    };
    loadSection();
  }, [sectionId, token]);

  const handleSave = async () => {
    const res = await fetch(`/api/admin/homepage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sectionId, title, subtitle, images }),
    });
    const data = await res.json();
    alert(data.success ? "✅ Section updated successfully" : "❌ Save failed");
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="space-y-4">
      <label className="block">
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border rounded w-full p-2"
        />
      </label>
      <label className="block">
        Subtitle
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          className="border rounded w-full p-2"
        />
      </label>
      <label className="block">
        Images
        <ImageUpload images={images} onChange={setImages} />
      </label>
      <Button onClick={handleSave}>Save Changes</Button>
    </div>
  );
};

/* ============================================================
   🧮 Admin Dashboard
============================================================ */
export default function AdminDashboardPage() {
  const { firebaseUser, profile, loading } = useAuth();
  const router = useRouter();
  const [token, setToken] = useState<string>("");
  const [stats, setStats] = useState({ users: 0, partners: 0, listings: 0, staffs: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [selectedStat, setSelectedStat] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!firebaseUser || profile?.role !== "admin")) {
      alert("❌ Not authorized");
      router.push("/");
    } else if (firebaseUser) {
      firebaseUser.getIdToken().then((t) => setToken(t));
    }
  }, [firebaseUser, profile, loading, router]);

  const authFetch = async (url: string, options: any = {}) => {
    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    return fetch(url, { ...options, headers });
  };

  useEffect(() => {
    if (!token || !profile || profile.role !== "admin") return;
    const fetchReports = async () => {
      const res = await authFetch("/api/reports");
      const data = await res.json();
      if (data.success) {
        const s = data.summary;
        setStats({
          users: s.totalBookings || 0,
          partners: s.totalPartners || 0,
          listings: s.totalSettlements || 0,
          staffs: s.totalRevenue ? Math.floor(s.totalRevenue / 1000) : 0,
        });
        setChartData(data.charts.last7Bookings || []);
      }
    };
    fetchReports();
  }, [token, profile]);

  if (loading || !profile)
    return <p className="text-center py-12">Loading dashboard...</p>;

  const homepageSections = [
    "hero",
    "quickActions",
    "featuredListings",
    "trendingDestinations",
    "promotions",
    "recentStories",
    "testimonials",
  ];

  return (
    <DashboardLayout title="Admin Dashboard" profile={profile}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {Object.entries(stats).map(([key, value]) => (
          <div
            key={key}
            onClick={() => setSelectedStat(key)}
            className="p-6 bg-white shadow rounded-lg text-center hover:shadow-lg transition cursor-pointer"
          >
            <h2 className="text-2xl font-bold">{value}</h2>
            <p className="text-gray-600 capitalize">{key}</p>
          </div>
        ))}
      </div>

      <section className="mb-12">
        <h3 className="font-semibold mb-4">Homepage Sections</h3>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {homepageSections.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className="p-4 bg-white rounded shadow hover:shadow-lg text-center transition"
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      <section className="bg-white shadow rounded-lg p-6 mb-12">
        <h3 className="font-semibold mb-4">Bookings (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="mt-12">
        <h3 className="text-lg font-semibold mb-4">Manage All Listings</h3>
        <ListingsManager />
      </section>

      <section className="mb-12">
        <h3 className="font-semibold mb-4">Partner Compliance</h3>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <a href="/admin/dashboard/kyc" className="p-4 bg-white rounded shadow hover:shadow-lg text-center transition block">
            🧾 Partner KYC Verification
          </a>
          <a href="/admin/dashboard/settlements" className="p-4 bg-white rounded shadow hover:shadow-lg text-center transition block">
            💰 Settlements & Payouts
          </a>
          <a href="/admin/dashboard/disputes" className="p-4 bg-white rounded shadow hover:shadow-lg text-center transition block">
            ⚠️ Disputes & SLA
          </a>
        </div>
      </section>

      <Modal isOpen={!!activeSection} onClose={() => setActiveSection(null)}>
        {activeSection && token && <SectionEditor sectionId={activeSection} token={token} />}
      </Modal>

      <Modal isOpen={!!selectedStat} onClose={() => setSelectedStat(null)}>
        {selectedStat && <DataList collectionName={selectedStat} token={token} />}
      </Modal>
    </DashboardLayout>
  );
}
