"use client";

import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Modal from "@/components/home/Modal";
import ListingsManager from "@/components/dashboard/ListingsManager";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

/* -------------------------------------------
   Image Upload Component
-------------------------------------------- */
const ImageUpload = ({ images, onChange, maxFiles = 5 }) => {
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files).slice(
      0,
      maxFiles - images.length
    );
    setLocalFiles((prev) => [...prev, ...filesArray]);
  };

  useEffect(() => {
    if (localFiles.length === 0) return;
    const uploadAll = async () => {
      setUploading(true);
      const uploadedUrls: string[] = [];
      for (const file of localFiles) {
        const storageRef = ref(storage, `homepage/${file.name}-${Date.now()}`);
        const snapshot = await uploadBytesResumable(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        uploadedUrls.push(url);
      }
      onChange([...images, ...uploadedUrls]);
      setLocalFiles([]);
      setUploading(false);
    };
    uploadAll();
  }, [localFiles]);

  const handleRemove = (url: string) =>
    onChange(images.filter((i) => i !== url));

  return (
    <div>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading || images.length >= maxFiles}
        className="mb-2"
      />
      {uploading && <p className="text-blue-600 mb-2">Uploading...</p>}
      <div className="flex flex-wrap gap-2">
        {images.map((url) => (
          <div
            key={url}
            className="relative w-24 h-24 border rounded overflow-hidden"
          >
            <img src={url} alt="preview" className="object-cover w-full h-full" />
            <button
              onClick={() => handleRemove(url)}
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

/* -------------------------------------------
   Homepage Section Editor
-------------------------------------------- */
const SectionEditor = ({ sectionId }: { sectionId: string }) => {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const refDoc = doc(db, "homepage", sectionId.toLowerCase());
      const snap = await getDoc(refDoc);
      if (snap.exists()) {
        const data = snap.data();
        setTitle(data.title || "");
        setSubtitle(data.subtitle || "");
        setImages(data.images || []);
      } else {
        await setDoc(refDoc, {
          title: "",
          subtitle: "",
          images: [],
          createdAt: serverTimestamp(),
        });
      }
      setLoading(false);
    };
    fetchData();
  }, [sectionId]);

  const handleSave = async () => {
    await updateDoc(doc(db, "homepage", sectionId.toLowerCase()), {
      title,
      subtitle,
      images,
      updatedAt: serverTimestamp(),
    });
    alert(`✅ ${sectionId} updated successfully`);
  };

  if (loading) return <p>Loading editor...</p>;

  return (
    <div className="space-y-4">
      <label className="block">
        Title
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border rounded w-full p-2"
        />
      </label>
      <label className="block">
        Subtitle
        <input
          type="text"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          className="border rounded w-full p-2"
        />
      </label>
      <label className="block">
        Images
        <ImageUpload images={images} onChange={setImages} maxFiles={5} />
      </label>
      <button
        onClick={handleSave}
        className="px-4 py-2 bg-yellow-700 text-white rounded hover:bg-yellow-800"
      >
        Save Changes
      </button>
    </div>
  );
};

/* -------------------------------------------
   Main Admin Dashboard
-------------------------------------------- */
export default function AdminDashboardPage() {
  const { firebaseUser, profile, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    users: 0,
    partners: 0,
    listings: 0,
    staffs: 0,
  });
  const [chartData, setChartData] = useState<{ date: string; count: number }[]>(
    []
  );
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!firebaseUser || profile?.role !== "admin")) {
      alert("❌ Not authorized");
      router.push("/");
    }
  }, [firebaseUser, profile, loading, router]);

  useEffect(() => {
    if (!firebaseUser || profile?.role !== "admin") return;

    const unsubscribers = [
      onSnapshot(collection(db, "users"), (snap) =>
        setStats((s) => ({ ...s, users: snap.size }))
      ),
      onSnapshot(collection(db, "partners"), (snap) =>
        setStats((s) => ({ ...s, partners: snap.size }))
      ),
      onSnapshot(collection(db, "listings"), (snap) =>
        setStats((s) => ({ ...s, listings: snap.size }))
      ),
      onSnapshot(collection(db, "staffs"), (snap) =>
        setStats((s) => ({ ...s, staffs: snap.size }))
      ),
      onSnapshot(collection(db, "bookings"), (snap) => {
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date();
          d.setDate(new Date().getDate() - i);
          return { date: d.toISOString().split("T")[0], count: 0 };
        });
        snap.docs.forEach((b) => {
          const date = b.data().date?.split?.("T")?.[0];
          const found = last7Days.find((d) => d.date === date);
          if (found) found.count += 1;
        });
        setChartData(last7Days.reverse());
      }),
    ];

    return () => unsubscribers.forEach((u) => u());
  }, [firebaseUser, profile]);

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
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {Object.entries(stats).map(([k, v]) => (
          <div
            key={k}
            className="p-6 bg-white shadow rounded-lg text-center hover:shadow-lg transition"
          >
            <h2 className="text-2xl font-bold">{v}</h2>
            <p className="text-gray-600 capitalize">{k}</p>
          </div>
        ))}
      </div>

      {/* Homepage Editor Section */}
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

      {/* Bookings Chart */}
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

      {/* Listings Manager Integration */}
      <section className="mt-12">
        <h3 className="text-lg font-semibold mb-4">Manage All Listings</h3>
        <ListingsManager />
      </section>

      {/* Modal for Section Editor */}
      <Modal isOpen={!!activeSection} onClose={() => setActiveSection(null)}>
        {activeSection && <SectionEditor sectionId={activeSection} />}
      </Modal>
    </DashboardLayout>
  );
}
