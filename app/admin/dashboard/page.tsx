"use client";

import {
  useState,
  useEffect,
  useRef,
  DragEvent,
  ChangeEvent,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

// ⬇️ NEW LAYOUT (Hybrid Admin Layout)
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";

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
   Image Upload Component
============================================================ */
type ImageUploadProps = {
  images: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  token?: string;
};

const ImageUpload: React.FC<ImageUploadProps> = ({
  images,
  onChange,
  maxFiles = 5,
  token,
}) => {
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
          multiple
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
        <p className="text-sm text-gray-500">
          {uploading ? "Uploading..." : "Drag & drop or click to upload images"}
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
};

/* ============================================================
   Homepage Section Editor
============================================================ */
const SectionEditor = ({ sectionId, token }: any) => {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();

    fetch(`/api/admin/homepage?section=${sectionId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.section) {
          setTitle(d.section.title || "");
          setSubtitle(d.section.subtitle || "");
          setImages(d.section.images || []);
        }
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [sectionId, token]);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="space-y-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border w-full p-2 rounded"
        placeholder="Title"
      />

      <input
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        className="border w-full p-2 rounded"
        placeholder="Subtitle"
      />

      <ImageUpload images={images} onChange={setImages} token={token} />

      <Button
        onClick={async () => {
          const res = await fetch("/api/admin/homepage", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ sectionId, title, subtitle, images }),
          });
          const data = await res.json();
          alert(data.success ? "Saved" : "Failed");
        }}
      >
        Save Changes
      </Button>
    </div>
  );
};

/* ============================================================
   ADMIN DASHBOARD PAGE
============================================================ */
export default function AdminDashboardPage() {
  const { firebaseUser, profile, loading } = useAuth();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [stats, setStats] = useState({
    users: 0,
    partners: 0,
    listings: 0,
    staffs: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [selectedStat, setSelectedStat] = useState<string | null>(null);

  /* ADMIN PROTECTION */
  useEffect(() => {
    if (loading) return;

    if (!firebaseUser || !["admin", "superadmin"].includes(profile?.role || "")) {
      router.push("/");
      return;
    }

    firebaseUser.getIdToken().then((t) => setToken(t));
  }, [firebaseUser, profile, loading, router]);

  /* Load Stats */
  useEffect(() => {
    if (!token) return;

    fetch("/api/reports", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const s = d.summary || {};
          setStats({
            users: s.totalUsers ?? 0,
            partners: s.totalPartners ?? 0,
            listings: s.totalListings ?? 0,
            staffs: s.totalStaffs ?? 0,
          });

          setChartData(
            Array.isArray(d.charts?.last7Bookings)
              ? d.charts.last7Bookings
              : []
          );
        }
      });
  }, [token]);

  if (loading || !profile) return <p>Loading...</p>;

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
    <AdminDashboardLayout title="Admin Dashboard" profile={profile}>
      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {Object.entries(stats).map(([key, val]) => (
          <div
            key={key}
            className="p-6 bg-white shadow rounded-lg text-center cursor-pointer hover:shadow-lg"
            onClick={() => setSelectedStat(key)}
          >
            <h2 className="text-2xl font-bold">{val}</h2>
            <p className="text-gray-600 capitalize">{key}</p>
          </div>
        ))}
      </div>

      {/* HOMEPAGE SECTIONS */}
      <section className="mb-12">
        <h3 className="font-semibold mb-4">Homepage Sections</h3>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {homepageSections.map((s) => (
            <button
              key={s}
              className="p-4 bg-white rounded shadow hover:shadow-lg"
              onClick={() => setActiveSection(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {/* CHART */}
      <section className="bg-white shadow rounded-lg p-6 mb-12">
        <h3 className="font-semibold mb-4">Bookings (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#2563eb"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* LISTINGS */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Manage All Listings</h3>
        <ListingsManager />
      </section>

      {/* COMPLIANCE */}
      <section className="mt-12 mb-12">
        <h3 className="font-semibold mb-4">Partner Compliance</h3>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Link
            href="/admin/dashboard/kyc"
            className="block p-4 bg-white rounded shadow hover:shadow-lg text-center"
          >
            🧾 Partner KYC Verification
          </Link>

          <Link
            href="/admin/dashboard/settlements"
            className="block p-4 bg-white rounded shadow hover:shadow-lg text-center"
          >
            💰 Settlements & Payouts
          </Link>

          <Link
            href="/admin/dashboard/disputes"
            className="block p-4 bg-white rounded shadow hover:shadow-lg text-center"
          >
            ⚠️ Disputes & SLA
          </Link>
        </div>
      </section>

      {/* MODALS */}
      <Modal isOpen={!!activeSection} onClose={() => setActiveSection(null)}>
        {activeSection && (
          <SectionEditor sectionId={activeSection} token={token} />
        )}
      </Modal>

      <Modal isOpen={!!selectedStat} onClose={() => setSelectedStat(null)}>
        {selectedStat && (
          <DataList collectionName={selectedStat} token={token} />
        )}
      </Modal>
    </AdminDashboardLayout>
  );
}
