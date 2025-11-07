"use client";

import { useState, useEffect } from "react";
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
   🖼️ Image Upload via /api/uploads
============================================================ */
const ImageUpload = ({ images, onChange, maxFiles = 5 }) => {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files).slice(0, maxFiles - images.length);
    setUploading(true);
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) uploadedUrls.push(data.url);
    }

    onChange([...images, ...uploadedUrls]);
    setUploading(false);
  };

  return (
    <div>
      <input
        type="file"
        multiple
        accept="image/*"
        disabled={uploading || images.length >= maxFiles}
        onChange={handleFileChange}
        className="mb-2"
      />
      {uploading && <p className="text-blue-600 mb-2">Uploading...</p>}
      <div className="flex flex-wrap gap-2">
        {images.map((url) => (
          <div key={url} className="relative w-24 h-24 border rounded overflow-hidden">
            <img src={url} alt="preview" className="object-cover w-full h-full" />
            <button
              onClick={() => onChange(images.filter((i) => i !== url))}
              className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
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
   🧩 Homepage Section Editor (Connected)
============================================================ */
const SectionEditor = ({ sectionId, token }: { sectionId: string; token: string }) => {
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
   🧮 Admin Dashboard (Connected)
============================================================ */
export default function AdminDashboardPage() {
  const { firebaseUser, profile, loading } = useAuth();
  const router = useRouter();

  const [token, setToken] = useState<string>("");
  const [stats, setStats] = useState({ users: 0, partners: 0, listings: 0, staffs: 0 });
  const [chartData, setChartData] = useState([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [selectedStat, setSelectedStat] = useState<string | null>(null);

  /* --- Ensure only admins can access --- */
  useEffect(() => {
    if (!loading && (!firebaseUser || profile?.role !== "admin")) {
      alert("❌ Not authorized");
      router.push("/");
    } else if (firebaseUser) {
      firebaseUser.getIdToken().then((t) => setToken(t));
    }
  }, [firebaseUser, profile, loading, router]);

  /* --- Authenticated Fetch Helper --- */
  const authFetch = async (url: string, options: any = {}) => {
    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    return fetch(url, { ...options, headers });
  };

  /* --- Load Stats and Charts --- */
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
      {/* === Stats === */}
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

      {/* === Homepage Section Editor === */}
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

      {/* === Bookings Chart === */}
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

      {/* === Listings === */}
      <section className="mt-12">
        <h3 className="text-lg font-semibold mb-4">Manage All Listings</h3>
        <ListingsManager />
      </section>
{/* === Compliance & Partner Management === */}
<section className="mb-12">
  <h3 className="font-semibold mb-4">Partner Compliance</h3>
  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
    <a
      href="/admin/dashboard/kyc"
      className="p-4 bg-white rounded shadow hover:shadow-lg text-center transition block"
    >
      🧾 Partner KYC Verification
    </a>
    <a
      href="/admin/dashboard/settlements"
      className="p-4 bg-white rounded shadow hover:shadow-lg text-center transition block"
    >
      💰 Settlements & Payouts
    </a>
    <a
      href="/admin/dashboard/disputes"
      className="p-4 bg-white rounded shadow hover:shadow-lg text-center transition block"
    >
      ⚠️ Disputes & SLA
    </a>
  </div>
</section>

      {/* === Modals === */}
      <Modal isOpen={!!activeSection} onClose={() => setActiveSection(null)}>
        {activeSection && token && <SectionEditor sectionId={activeSection} token={token} />}
      </Modal>

      <Modal isOpen={!!selectedStat} onClose={() => setSelectedStat(null)}>
        {selectedStat && <DataList collectionName={selectedStat} token={token} />}
      </Modal>
    </DashboardLayout>
  );
}
