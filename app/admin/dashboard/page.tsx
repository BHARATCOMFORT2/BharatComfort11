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
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ---------- Interfaces ----------
interface Stay {
  id: string;
  name: string;
  location: string;
  price: number;
  images?: string[];
  partnerId?: string;
  featured?: boolean;
}

interface Booking {
  id: string;
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  amount: number;
}

interface Destination {
  id: string;
  name: string;
  image?: string;
}

// ---------- Component ----------
export default function AdminDashboard() {
  // ---------- State ----------
  const [stays, setStays] = useState<Stay[]>([]);
  const [filteredStays, setFilteredStays] = useState<Stay[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [newStay, setNewStay] = useState<Partial<Stay>>({});
  const [stayImages, setStayImages] = useState<File[]>([]);
  const [editingStayId, setEditingStayId] = useState<string | null>(null);

  const [newDestination, setNewDestination] = useState<Partial<Destination>>({});
  const [destinationImage, setDestinationImage] = useState<File | null>(null);
  const [editingDestinationId, setEditingDestinationId] = useState<string | null>(null);

  const [analyticsStart, setAnalyticsStart] = useState("");
  const [analyticsEnd, setAnalyticsEnd] = useState("");
  const [analyticsStayFilter, setAnalyticsStayFilter] = useState("all");

  // ---------- Real-time fetch ----------
  useEffect(() => {
    const unsubStays = onSnapshot(collection(db, "stays"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Stay[];
      setStays(data);
      setFilteredStays(data);
      setLoading(false);
    });

    const unsubBookings = onSnapshot(collection(db, "bookings"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Booking[];
      setBookings(data);
    });

    const unsubDest = onSnapshot(collection(db, "destinations"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Destination[];
      setDestinations(data);
    });

    return () => {
      unsubStays();
      unsubBookings();
      unsubDest();
    };
  }, []);

  // ---------- Filter stays ----------
  useEffect(() => {
    let result = stays;
    if (search.trim()) {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.location.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (minPrice) result = result.filter((s) => s.price >= parseInt(minPrice));
    if (maxPrice) result = result.filter((s) => s.price <= parseInt(maxPrice));
    setFilteredStays(result);
  }, [search, minPrice, maxPrice, stays]);

  // ---------- Stay management ----------
  const handleSaveStay = async () => {
    try {
      let imageUrls: string[] = [];
      for (const file of stayImages) {
        const storageRef = ref(storage, `stays/${file.name}_${Date.now()}`);
        const snap = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snap.ref);
        imageUrls.push(url);
      }

      if (editingStayId) {
        await updateDoc(doc(db, "stays", editingStayId), {
          ...newStay,
          images: imageUrls.length ? imageUrls : undefined,
        });
        alert("Stay updated!");
      } else {
        await addDoc(collection(db, "stays"), {
          ...newStay,
          images: imageUrls,
          featured: false,
          createdAt: serverTimestamp(),
        });
        alert("Stay added!");
      }

      setNewStay({});
      setStayImages([]);
      setEditingStayId(null);
    } catch (err: any) {
      console.error(err);
      alert("Error saving stay: " + err.message);
    }
  };

  const handleDeleteStay = async (id: string) => {
    if (!confirm("Delete this stay?")) return;
    await deleteDoc(doc(db, "stays", id));
    alert("Stay deleted!");
  };

  const toggleFeatured = async (stay: Stay) => {
    await updateDoc(doc(db, "stays", stay.id), { featured: !stay.featured });
  };

  // ---------- Destination management ----------
  const handleSaveDestination = async () => {
    try {
      let imageUrl = "";
      if (destinationImage) {
        const storageRef = ref(storage, `destinations/${destinationImage.name}_${Date.now()}`);
        const snap = await uploadBytes(storageRef, destinationImage);
        imageUrl = await getDownloadURL(snap.ref);
      }

      if (editingDestinationId) {
        await updateDoc(doc(db, "destinations", editingDestinationId), {
          ...newDestination,
          image: imageUrl || undefined,
        });
        alert("Destination updated!");
      } else {
        await addDoc(collection(db, "destinations"), {
          ...newDestination,
          image: imageUrl,
          createdAt: serverTimestamp(),
        });
        alert("Destination added!");
      }

      setNewDestination({});
      setDestinationImage(null);
      setEditingDestinationId(null);
    } catch (err: any) {
      console.error(err);
      alert("Error saving destination: " + err.message);
    }
  };

  const handleDeleteDestination = async (id: string) => {
    if (!confirm("Delete this destination?")) return;
    await deleteDoc(doc(db, "destinations", id));
    alert("Destination deleted!");
  };

  // ---------- Analytics ----------
  const analyticsData = stays.map((stay) => {
    const stayBookings = bookings.filter((b) => {
      if (analyticsStayFilter !== "all" && b.listingId !== analyticsStayFilter) return false;
      if (analyticsStart && new Date(b.checkIn) < new Date(analyticsStart)) return false;
      if (analyticsEnd && new Date(b.checkOut) > new Date(analyticsEnd)) return false;
      return true;
    });
    const revenue = stayBookings.reduce((acc, b) => acc + b.amount, 0);
    return { name: stay.name, bookings: stayBookings.length, revenue };
  }).filter((d) => analyticsStayFilter === "all" || d.bookings > 0);

  if (loading) return <div className="p-8 text-center">Loading dashboard...</div>;

  return (
    <div className="p-6 space-y-12">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>

      {/* ---------- Stay Management ---------- */}
      <section className="bg-white p-4 rounded shadow">
        <h2 className="text-2xl font-semibold mb-4">Manage Stays</h2>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input type="text" placeholder="Name" value={newStay.name || ""} onChange={e=>setNewStay({...newStay,name:e.target.value})} className="border p-2 rounded"/>
          <input type="text" placeholder="Location" value={newStay.location || ""} onChange={e=>setNewStay({...newStay,location:e.target.value})} className="border p-2 rounded"/>
          <input type="number" placeholder="Price" value={newStay.price || ""} onChange={e=>setNewStay({...newStay,price:Number(e.target.value)})} className="border p-2 rounded"/>
          <input type="file" multiple onChange={e=>setStayImages(e.target.files ? Array.from(e.target.files) : [])} className="border p-2 rounded"/>
          <button onClick={handleSaveStay} className="bg-indigo-600 text-white px-4 rounded">
            {editingStayId ? "Update" : "Add"} Stay
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <input type="text" placeholder="Search" value={search} onChange={e=>setSearch(e.target.value)} className="border p-2 rounded"/>
          <input type="number" placeholder="Min Price" value={minPrice} onChange={e=>setMinPrice(e.target.value)} className="border p-2 rounded w-24"/>
          <input type="number" placeholder="Max Price" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} className="border p-2 rounded w-24"/>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStays.map(stay => (
            <div key={stay.id} className="border rounded p-2 relative">
              <h3 className="font-semibold">{stay.name}</h3>
              <p>{stay.location}</p>
              <p>₹{stay.price}</p>
              <p>Featured: {stay.featured ? "Yes" : "No"}</p>
              <div className="flex gap-2 mt-2">
                <button onClick={()=>{setEditingStayId(stay.id); setNewStay(stay)}} className="bg-yellow-500 px-2 rounded">Edit</button>
                <button onClick={()=>handleDeleteStay(stay.id)} className="bg-red-500 px-2 rounded text-white">Delete</button>
                <button onClick={()=>toggleFeatured(stay)} className="bg-green-500 px-2 rounded text-white">Toggle Featured</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Trending Destinations ---------- */}
      <section className="bg-white p-4 rounded shadow">
        <h2 className="text-2xl font-semibold mb-4">Trending Destinations</h2>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input type="text" placeholder="Name" value={newDestination.name || ""} onChange={e=>setNewDestination({...newDestination,name:e.target.value})} className="border p-2 rounded"/>
          <input type="file" onChange={e=>setDestinationImage(e.target.files ? e.target.files[0] : null)} className="border p-2 rounded"/>
          <button onClick={handleSaveDestination} className="bg-indigo-600 text-white px-4 rounded">{editingDestinationId ? "Update" : "Add"} Destination</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {destinations.map(dest => (
            <div key={dest.id} className="border rounded p-2 relative">
              <h3 className="font-semibold">{dest.name}</h3>
              {dest.image && <img src={dest.image} alt={dest.name} className="h-24 w-full object-cover"/>}
              <div className="flex gap-2 mt-2">
                <button onClick={()=>{setEditingDestinationId(dest.id); setNewDestination(dest)}} className="bg-yellow-500 px-2 rounded">Edit</button>
                <button onClick={()=>handleDeleteDestination(dest.id)} className="bg-red-500 px-2 rounded text-white">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Bookings Analytics ---------- */}
      <section className="bg-white p-4 rounded shadow">
        <h2 className="text-2xl font-semibold mb-4">Bookings & Analytics</h2>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input type="date" value={analyticsStart} onChange={e=>setAnalyticsStart(e.target.value)} className="border p-2 rounded"/>
          <input type="date" value={analyticsEnd} onChange={e=>setAnalyticsEnd(e.target.value)} className="border p-2 rounded"/>
          <select value={analyticsStayFilter} onChange={e=>setAnalyticsStayFilter(e.target.value)} className="border p-2 rounded">
            <option value="all">All Stays</option>
            {stays.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <p>Total Bookings: {bookings.filter(b=>{
          if (analyticsStayFilter !== "all" && b.listingId !== analyticsStayFilter) return false;
          if (analyticsStart && new Date(b.checkIn) < new Date(analyticsStart)) return false;
          if (analyticsEnd && new Date(b.checkOut) > new Date(analyticsEnd)) return false;
          return true;
        }).length}</p>

        <p>Total Revenue: ₹{bookings.filter(b=>{
          if (analyticsStayFilter !== "all" && b.listingId !== analyticsStayFilter) return false;
          if (analyticsStart && new Date(b.checkIn) < new Date(analyticsStart)) return false;
          if (analyticsEnd && new Date(b.checkOut) > new Date(analyticsEnd)) return false;
          return true;
        }).reduce((acc,b)=>acc+b.amount,0)}</p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">Bookings per Stay</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="name"/>
                <YAxis allowDecimals={false}/>
                <Tooltip/>
                <Bar dataKey="bookings" fill="#4f46e5"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="p-4 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">Revenue per Stay</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="name"/>
                <YAxis/>
                <Tooltip/>
                <Bar dataKey="revenue" fill="#f59e0b"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ---------- Staff Management Placeholder ---------- */}
      <section className="bg-white p-4 rounded shadow">
        <h2 className="text-2xl font-semibold mb-4">Staff Management (Coming Soon)</h2>
        <p>You can implement roles and staff management here later.</p>
      </section>
    </div>
  );
}
