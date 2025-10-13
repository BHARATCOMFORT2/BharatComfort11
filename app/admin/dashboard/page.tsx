"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { motion } from "framer-motion";

// Interfaces
interface Stay {
  id: string;
  name: string;
  location: string;
  price: number;
  image?: string;
  partnerId?: string;
  featured?: boolean;
}

interface Destination {
  id: string;
  name: string;
  image?: string;
  trending?: boolean;
}

interface Staff {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"stays" | "destinations" | "staffs">("stays");

  // Data states
  const [stays, setStays] = useState<Stay[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [stayForm, setStayForm] = useState<Partial<Stay>>({});
  const [destinationForm, setDestinationForm] = useState<Partial<Destination>>({});
  const [staffForm, setStaffForm] = useState<Partial<Staff>>({});

  // Real-time fetch data
  useEffect(() => {
    setLoading(true);
    const unsubStays = onSnapshot(collection(db, "stays"), (snapshot) => {
      setStays(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stay)));
    });
    const unsubDest = onSnapshot(collection(db, "destinations"), (snapshot) => {
      setDestinations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Destination)));
    });
    const unsubStaffs = onSnapshot(collection(db, "staffs"), (snapshot) => {
      setStaffs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff)));
    });
    setLoading(false);

    return () => {
      unsubStays();
      unsubDest();
      unsubStaffs();
    };
  }, []);

  // Generic Delete
  const handleDelete = async (collectionName: string, id: string) => {
    if (!confirm("Are you sure you want to delete?")) return;
    await deleteDoc(doc(db, collectionName, id));
  };

  // Generic Submit for Stay/Destination/Staff
  const handleSubmit = async (type: "stay" | "destination" | "staff") => {
    try {
      if (type === "stay") {
        if (stayForm.id) {
          await updateDoc(doc(db, "stays", stayForm.id), stayForm);
        } else {
          await addDoc(collection(db, "stays"), stayForm);
        }
        setStayForm({});
      } else if (type === "destination") {
        if (destinationForm.id) {
          await updateDoc(doc(db, "destinations", destinationForm.id), destinationForm);
        } else {
          await addDoc(collection(db, "destinations"), destinationForm);
        }
        setDestinationForm({});
      } else if (type === "staff") {
        if (staffForm.id) {
          await updateDoc(doc(db, "staffs", staffForm.id), staffForm);
        } else {
          await addDoc(collection(db, "staffs"), staffForm);
        }
        setStaffForm({});
      }
    } catch (err) {
      console.error(err);
      alert("Operation failed.");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <motion.div className="min-h-screen p-6 bg-gray-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-3xl font-bold mb-6 text-center">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="flex gap-4 justify-center mb-6">
        <button onClick={() => setActiveTab("stays")} className={`px-4 py-2 rounded ${activeTab === "stays" ? "bg-indigo-600 text-white" : "bg-gray-200"}`}>Stays</button>
        <button onClick={() => setActiveTab("destinations")} className={`px-4 py-2 rounded ${activeTab === "destinations" ? "bg-indigo-600 text-white" : "bg-gray-200"}`}>Trending Destinations</button>
        <button onClick={() => setActiveTab("staffs")} className={`px-4 py-2 rounded ${activeTab === "staffs" ? "bg-indigo-600 text-white" : "bg-gray-200"}`}>Staffs</button>
      </div>

      {/* Stays Tab */}
      {activeTab === "stays" && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Manage Stays/Listings</h2>
          <div className="bg-white p-4 rounded shadow mb-4">
            <input type="text" placeholder="Name" value={stayForm.name || ""} onChange={(e) => setStayForm({ ...stayForm, name: e.target.value })} className="border p-2 rounded w-full mb-2"/>
            <input type="text" placeholder="Location" value={stayForm.location || ""} onChange={(e) => setStayForm({ ...stayForm, location: e.target.value })} className="border p-2 rounded w-full mb-2"/>
            <input type="number" placeholder="Price" value={stayForm.price || ""} onChange={(e) => setStayForm({ ...stayForm, price: Number(e.target.value) })} className="border p-2 rounded w-full mb-2"/>
            <input type="text" placeholder="Image URL" value={stayForm.image || ""} onChange={(e) => setStayForm({ ...stayForm, image: e.target.value })} className="border p-2 rounded w-full mb-2"/>
            <label className="flex items-center gap-2 mb-2">
              <input type="checkbox" checked={stayForm.featured || false} onChange={(e) => setStayForm({ ...stayForm, featured: e.target.checked })}/> Featured
            </label>
            <button onClick={() => handleSubmit("stay")} className="bg-indigo-600 text-white px-4 py-2 rounded">{stayForm.id ? "Update Stay" : "Add Stay"}</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stays.map((s) => (
              <div key={s.id} className="bg-white p-4 rounded shadow flex flex-col">
                <img src={s.image || "/placeholder.jpg"} className="h-40 w-full object-cover rounded"/>
                <h3 className="font-semibold mt-2">{s.name}</h3>
                <p>{s.location}</p>
                <p>₹{s.price}/night</p>
                <div className="flex gap-2 mt-2">
                  <button className="bg-gray-200 px-2 py-1 rounded" onClick={() => setStayForm(s)}>Edit</button>
                  <button className="bg-red-600 text-white px-2 py-1 rounded" onClick={() => handleDelete("stays", s.id)}>Delete</button>
                  <button className={`px-2 py-1 rounded ${s.featured ? "bg-green-600 text-white" : "bg-gray-200"}`} onClick={async () => {
                    await updateDoc(doc(db, "stays", s.id), { featured: !s.featured });
                  }}>
                    {s.featured ? "Featured" : "Mark Featured"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Destinations Tab */}
      {activeTab === "destinations" && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Manage Trending Destinations</h2>
          <div className="bg-white p-4 rounded shadow mb-4">
            <input type="text" placeholder="Destination Name" value={destinationForm.name || ""} onChange={(e) => setDestinationForm({ ...destinationForm, name: e.target.value })} className="border p-2 rounded w-full mb-2"/>
            <input type="text" placeholder="Image URL" value={destinationForm.image || ""} onChange={(e) => setDestinationForm({ ...destinationForm, image: e.target.value })} className="border p-2 rounded w-full mb-2"/>
            <label className="flex items-center gap-2 mb-2">
              <input type="checkbox" checked={destinationForm.trending || false} onChange={(e) => setDestinationForm({ ...destinationForm, trending: e.target.checked })}/> Trending
            </label>
            <button onClick={() => handleSubmit("destination")} className="bg-indigo-600 text-white px-4 py-2 rounded">{destinationForm.id ? "Update Destination" : "Add Destination"}</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {destinations.map((d) => (
              <div key={d.id} className="bg-white p-4 rounded shadow flex flex-col">
                <img src={d.image || "/placeholder.jpg"} className="h-40 w-full object-cover rounded"/>
                <h3 className="font-semibold mt-2">{d.name}</h3>
                <button className={`px-2 py-1 rounded ${d.trending ? "bg-green-600 text-white" : "bg-gray-200"}`} onClick={async () => {
                  await updateDoc(doc(db, "destinations", d.id), { trending: !d.trending });
                }}>
                  {d.trending ? "Trending" : "Mark Trending"}
                </button>
                <button className="bg-red-600 text-white px-2 py-1 rounded mt-2" onClick={() => handleDelete("destinations", d.id)}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staffs Tab */}
      {activeTab === "staffs" && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Manage Staffs & Roles</h2>
          <div className="bg-white p-4 rounded shadow mb-4">
            <input type="text" placeholder="Name" value={staffForm.name || ""} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} className="border p-2 rounded w-full mb-2"/>
            <input type="email" placeholder="Email" value={staffForm.email || ""} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} className="border p-2 rounded w-full mb-2"/>
            <select value={staffForm.role || ""} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })} className="border p-2 rounded w-full mb-2">
              <option value="">Select Role</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded" onClick={() => handleSubmit("staff")}>{staffForm.id ? "Update Staff" : "Add Staff"}</button>
          </div>
          <div className="space-y-2">
            {staffs.map((s) => (
              <div key={s.id} className="bg-white p-3 rounded shadow flex justify-between items-center">
                <div>
                  <p><strong>Name:</strong> {s.name}</p>
                  <p><strong>Email:</strong> {s.email}</p>
                  <p><strong>Role:</strong> {s.role || "Staff"}</p>
                </div>
                <div className="flex gap-2">
                  <button className="bg-gray-200 px-2 py-1 rounded" onClick={() => setStaffForm(s)}>Edit</button>
                  <button className="bg-red-600 text-white px-2 py-1 rounded" onClick={() => handleDelete("staffs", s.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
