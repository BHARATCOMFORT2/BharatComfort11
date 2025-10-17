"use client";

import { useEffect, useState } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/Button";

// ================= TYPES =================
interface Listing {
  id?: string;
  name: string;
  description: string;
  location: string;
  price: number;
  images: string[];
  createdBy: string;
  status: "pending" | "approved" | "rejected";
  featuredStatus?: "none" | "pending" | "approved" | "rejected";
  createdAt?: any;
}

interface Booking {
  id: string;
  userName?: string;
  customerName?: string;
  date: string;
  amount?: number;
}

// ================= MAIN COMPONENT =================
export default function PartnerDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Dashboard Stats
  const [stats, setStats] = useState({ listings: 0, bookings: 0, earnings: 0 });
  const [chartData, setChartData] = useState<{ date: string; count: number }[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);

  // Listings Management
  const [listings, setListings] = useState<Listing[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    price: "",
    images: [] as File[],
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // ================= INIT =================
  useEffect(() => {
    let unsubListings: any = null;
    let unsubBookings: any = null;

    const init = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          router.push("/auth/login");
          return;
        }

        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (!userSnap.exists() || userSnap.data().role !== "partner") {
          alert("❌ Not authorized");
          router.push("/");
          return;
        }

        setProfile(userSnap.data());
        const uid = user.uid;
        console.log("✅ Partner logged in:", uid);

        // --- Real-time LISTINGS ---
        const listingsQuery = query(
          collection(db, "listings"),
          where("createdBy", "==", uid),
          orderBy("createdAt", "desc")
        );
        unsubListings = onSnapshot(
          listingsQuery,
          (snap) => {
            const data = snap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Listing),
            }));
            console.log("📦 Listings fetched:", data.length);
            setListings(data);
            setStats((prev) => ({ ...prev, listings: data.length }));
          },
          (error) => {
            console.error("🔥 Listings snapshot error:", error);
          }
        );

        // --- Real-time BOOKINGS ---
        const bookingsQuery = query(
          collection(db, "bookings"),
          where("partnerId", "==", uid),
          orderBy("createdAt", "desc")
        );
        unsubBookings = onSnapshot(
          bookingsQuery,
          (snap) => {
            const bookings = snap.docs.map((d) => {
  const data = d.data() as Booking;
  return { ...data, id: d.id };
});

            let total = 0;
            bookings.forEach((b) => (total += b.amount || 0));

            setStats((prev) => ({
              ...prev,
              bookings: bookings.length,
              earnings: total,
            }));

            // Chart data (last 7 days)
            const today = new Date();
            const last7Days = Array.from({ length: 7 }).map((_, i) => {
              const d = new Date();
              d.setDate(today.getDate() - i);
              return { date: d.toISOString().split("T")[0], count: 0 };
            }).reverse();

            bookings.forEach((b) => {
              const date = b.date?.split?.("T")?.[0];
              const match = last7Days.find((x) => x.date === date);
              if (match) match.count += 1;
            });

            setRecentBookings(bookings.slice(0, 10));
            setChartData(last7Days);
            setLoading(false);
          },
          (error) => {
            console.error("🔥 Bookings snapshot error:", error);
            setLoading(false);
          }
        );

        // Fallback timeout — prevents infinite loading
        setTimeout(() => setLoading(false), 8000);
      } catch (err) {
        console.error("🔥 PartnerDashboard init error:", err);
        setLoading(false);
      }
    };

    init();
    return () => {
      if (unsubListings) unsubListings();
      if (unsubBookings) unsubBookings();
    };
  }, [router]);

  // ================= IMAGE UPLOAD =================
  const uploadImages = async (files: File[]) => {
    const urls: string[] = [];
    for (const file of files) {
      const storageRef = ref(storage, `listings/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      urls.push(url);
    }
    return urls;
  };

  // ================= LISTINGS CRUD =================
  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) return alert("Please login");
    setUploading(true);

    try {
      const imageUrls = formData.images.length
        ? await uploadImages(formData.images)
        : [];

      const data = {
        name: formData.name,
        description: formData.description,
        location: formData.location,
        price: Number(formData.price),
        images: imageUrls,
        createdBy: user.uid,
        status: "pending",
        featuredStatus: "none",
        createdAt: serverTimestamp(),
      };

      if (editId) {
        await updateDoc(doc(db, "listings", editId), data);
        alert("✅ Listing updated!");
        setEditId(null);
      } else {
        await addDoc(collection(db, "listings"), data);
        alert("✅ Listing added successfully!");
      }

      setFormData({ name: "", description: "", location: "", price: "", images: [] });
    } catch (err) {
      console.error(err);
      alert("❌ Error saving listing");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    await deleteDoc(doc(db, "listings", id));
    alert("🗑️ Listing deleted");
  };

  const handleEdit = (l: Listing) => {
    setEditId(l.id!);
    setFormData({
      name: l.name,
      description: l.description,
      location: l.location,
      price: l.price.toString(),
      images: [],
    });
  };

  // Partner requests for Featured listing
  const handleRequestFeatured = async (id: string) => {
    await updateDoc(doc(db, "listings", id), { featuredStatus: "pending" });
    alert("🌟 Featured listing request sent!");
  };

  // ================= RENDER =================
  if (loading)
    return <p className="text-center py-12 text-gray-600">Loading dashboard...</p>;

  return (
    <DashboardLayout
      title="Partner Dashboard"
      profile={{
        name: profile?.businessName || profile?.name,
        role: "partner",
        profilePic: profile?.profilePic,
      }}
    >
      {/* ==================== STATS ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="p-6 bg-white shadow rounded-2xl text-center">
            <h2 className="text-2xl font-bold">{value}</h2>
            <p className="text-gray-600 capitalize">{key}</p>
          </div>
        ))}
      </div>

      {/* ==================== BOOKINGS CHART ==================== */}
      <div className="bg-white shadow rounded-2xl p-6 mb-12">
        <h3 className="text-lg font-semibold mb-4">Bookings (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ==================== MANAGE LISTINGS ==================== */}
      <section className="bg-white shadow rounded-2xl p-6 mb-12">
        <h3 className="text-xl font-semibold mb-6">Manage Your Listings</h3>

        {/* Form */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <input
            placeholder="Name"
            className="border p-2 rounded"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <input
            placeholder="Location"
            className="border p-2 rounded"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
          <input
            placeholder="Price"
            type="number"
            className="border p-2 rounded"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          />
          <textarea
            placeholder="Description"
            className="border p-2 rounded col-span-full"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) =>
              setFormData({
                ...formData,
                images: Array.from(e.target.files || []),
              })
            }
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={uploading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg"
        >
          {uploading ? "Processing..." : editId ? "Update Listing" : "Add Listing"}
        </Button>

        {/* Listings Table */}
        <div className="mt-8">
          {listings.length === 0 ? (
            <p className="text-gray-500">No listings found.</p>
          ) : (
            <div className="space-y-4">
              {listings.map((l) => (
                <div
                  key={l.id}
                  className="flex justify-between items-center border-b pb-3"
                >
                  <div>
                    <h3 className="font-semibold">{l.name}</h3>
                    <p className="text-sm text-gray-600">{l.location}</p>
                    <p className="text-sm text-gray-600">
                      ₹{l.price} •{" "}
                      <span
                        className={`font-semibold ${
                          l.status === "approved"
                            ? "text-green-600"
                            : l.status === "pending"
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {l.status}
                      </span>
                    </p>
                    {l.featuredStatus && (
                      <p className="text-xs text-gray-500">
                        Featured: {l.featuredStatus}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEdit(l)}
                      className="bg-yellow-500 hover:bg-yellow-600"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(l.id!)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </Button>
                    <Button
                      onClick={() => handleRequestFeatured(l.id!)}
                      disabled={l.featuredStatus === "pending"}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {l.featuredStatus === "pending"
                        ? "Requested"
                        : "Request Featured"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </DashboardLayout>
  );
}
