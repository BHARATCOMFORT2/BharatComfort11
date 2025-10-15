"use client";

import { useState, useEffect } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Modal from "@/components/dashboard/Modal";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

// ---------- SIMPLE IMAGE UPLOAD ----------
const ImageUpload = ({ images, onChange, maxFiles = 5 }: { images: string[]; onChange: (urls: string[]) => void; maxFiles?: number }) => {
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files).slice(0, maxFiles - images.length);
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

  const handleRemove = (url: string) => onChange(images.filter((i) => i !== url));

  return (
    <div>
      <input type="file" multiple accept="image/*" onChange={handleFileChange} disabled={uploading || images.length >= maxFiles} className="mb-2"/>
      {uploading && <p className="text-blue-600 mb-2">Uploading...</p>}
      <div className="flex flex-wrap gap-2">
        {images.map(url => (
          <div key={url} className="relative w-24 h-24 border rounded overflow-hidden">
            <img src={url} alt="preview" className="object-cover w-full h-full"/>
            <button onClick={() => handleRemove(url)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">×</button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- SIMPLE EDITOR FOR ANY SECTION ----------
const SectionEditor = ({ sectionId }: { sectionId: string }) => {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const snap = await getDoc(doc(db, "homepage", sectionId));
      if (snap.exists()) {
        const data = snap.data();
        setTitle(data.title || "");
        setSubtitle(data.subtitle || "");
        setImages(data.images || []);
      }
      setLoading(false);
    };
    fetchData();
  }, [sectionId]);

  const handleSave = async () => {
    await updateDoc(doc(db, "homepage", sectionId), { title, subtitle, images });
    alert(`✅ ${sectionId} updated`);
  };

  if (loading) return <p>Loading editor...</p>;

  return (
    <div className="space-y-4">
      <label className="block">
        Title
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="border rounded w-full p-2"/>
      </label>
      <label className="block">
        Subtitle
        <input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)} className="border rounded w-full p-2"/>
      </label>
      <label className="block">
        Images
        <ImageUpload images={images} onChange={setImages} maxFiles={5}/>
      </label>
      <button onClick={handleSave} className="px-4 py-2 bg-yellow-700 text-white rounded hover:bg-yellow-800">Save Changes</button>
    </div>
  );
};

// ---------- DASHBOARD PAGE ----------
export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [stats, setStats] = useState({ users: 0, partners: 0, listings: 0, staffs: 0 });
  const [chartData, setChartData] = useState<{ date: string; count: number }[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // ---------- LOAD DATA ----------
  useEffect(() => {
    const unsub: (() => void)[] = [];
    const init = async () => {
      const user = auth.currentUser;
      if (!user) return router.push("/auth/login");

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists() || userDoc.data().role !== "admin") {
        alert("❌ Not authorized");
        return router.push("/");
      }
      setUserName(userDoc.data().name || "Admin");

      unsub.push(onSnapshot(collection(db, "users"), snap => setStats(s => ({ ...s, users: snap.docs.length }))));
      unsub.push(onSnapshot(collection(db, "partners"), snap => setStats(s => ({ ...s, partners: snap.docs.length }))));
      unsub.push(onSnapshot(collection(db, "listings"), snap => setStats(s => ({ ...s, listings: snap.docs.length }))));
      unsub.push(onSnapshot(collection(db, "staffs"), snap => setStats(s => ({ ...s, staffs: snap.docs.length }))));
      unsub.push(onSnapshot(collection(db, "bookings"), snap => {
        const last7Days = Array.from({length:7}).map((_,i)=>{const d=new Date();d.setDate(new Date().getDate()-i);return {date:d.toISOString().split("T")[0],count:0};}).reverse();
        snap.docs.forEach(b=>{const date = b.data().date?.split?.("T")?.[0]; const found = last7Days.find(d=>d.date===date); if(found) found.count+=1;});
        setChartData(last7Days);
      }));

      setLoading(false);
    };
    init();
    return () => unsub.forEach(u => u());
  }, [router]);

  if (loading) return <p className="text-center py-12">Loading dashboard...</p>;

  const homepageSections = ["Hero","QuickActions","FeaturedListings","TrendingDestinations","Promotions","RecentStories","Testimonials"];

  return (
    <DashboardLayout title="Admin Dashboard" profile={{ name: userName, role:"admin" }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {Object.entries(stats).map(([k,v]) => <div key={k} className="p-6 bg-white shadow rounded-lg text-center"><h2 className="text-2xl font-bold">{v}</h2><p className="text-gray-600 capitalize">{k}</p></div>)}
      </div>

      <section className="mb-12">
        <h3 className="font-semibold mb-4">Homepage Sections</h3>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {homepageSections.map(s => (
            <button key={s} onClick={()=>setActiveSection(s)} className="p-4 bg-white rounded shadow hover:shadow-lg text-center">{s}</button>
          ))}
        </div>
      </section>

      <section className="bg-white shadow rounded-lg p-6 mb-12">
        <h3 className="font-semibold mb-4">Bookings (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="date"/>
            <YAxis/>
            <Tooltip/>
            <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2}/>
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Modal for homepage section editor */}
      <Modal isOpen={!!activeSection} onClose={()=>setActiveSection(null)}>
        {activeSection && <SectionEditor sectionId={activeSection} />}
      </Modal>
    </DashboardLayout>
  );
}
