"use client";

import { useEffect, useState } from "react";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

interface Listing {
  id?: string;
  name: string;
  description: string;
  location: string;
  price: number;
  images: string[];
  createdBy: string;
  status: "pending" | "approved" | "rejected";
  featured?: boolean;
  createdAt?: any;
}

export default function ManageListingsPage() {
  const { firebaseUser: user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    price: "",
    images: [] as File[],
  });
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // ✅ Fetch user role from Firestore
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.uid) return;
      const refUser = doc(db, "users", user.uid);
      const snap = await getDoc(refUser);
      if (snap.exists()) {
        setUserRole(snap.data().role || "partner");
      } else {
        setUserRole("partner");
      }
    };
    fetchUserRole();
  }, [user]);

  // ✅ Real-time listings fetch
  useEffect(() => {
    if (!user || !userRole) return;

    const listingsQuery =
      userRole === "admin"
        ? query(collection(db, "listings"), orderBy("createdAt", "desc"))
        : query(
            collection(db, "listings"),
            where("createdBy", "==", user.uid),
            orderBy("createdAt", "desc")
          );

    const unsubscribe = onSnapshot(listingsQuery, (snapshot) => {
      const data = snapshot.docs.map((d) => {
        const listingData = d.data() as Listing;
        return { ...listingData, id: d.id }; // ✅ id last to avoid overwriting
      });
      setListings(data);
    });

    return () => unsubscribe();
  }, [user, userRole]);

  // ✅ Upload multiple images
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

  // ✅ Add or Edit listing
  const handleSubmit = async () => {
    if (!user) return alert("Please login first.");

    setLoading(true);
    try {
      const imageUrls = formData.images.length
        ? await uploadImages(formData.images)
        : [];

      const listingData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        price: Number(formData.price),
        images: imageUrls,
        createdBy: user.uid,
        status: userRole === "admin" ? "approved" : "pending",
        featured: false,
        createdAt: serverTimestamp(),
      };

      if (editId) {
        await updateDoc(doc(db, "listings", editId), listingData);
        alert("✅ Listing updated successfully!");
        setEditId(null);
      } else {
        await addDoc(collection(db, "listings"), listingData);
        alert("✅ Listing added successfully!");
      }

      setFormData({
        name: "",
        description: "",
        location: "",
        price: "",
        images: [],
      });
    } catch (error) {
      console.error("Error saving listing:", error);
      alert("❌ Failed to save listing");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Delete listing
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    try {
      await deleteDoc(doc(db, "listings", id));
      alert("🗑️ Listing deleted successfully");
    } catch (err) {
      console.error(err);
      alert("❌ Error deleting listing");
    }
  };

  // ✅ Approve / Reject listing
  const handleStatusChange = async (
    id: string,
    newStatus: "approved" | "rejected"
  ) => {
    try {
      await updateDoc(doc(db, "listings", id), { status: newStatus });
      alert(`✅ Listing ${newStatus}`);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to update status");
    }
  };

  // ✅ Toggle featured (Admin only)
  const handleToggleFeatured = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, "listings", id), { featured: !current });
      alert(
        `⭐ Listing has been ${!current ? "marked as featured" : "unmarked"}`
      );
    } catch (err) {
      console.error(err);
      alert("❌ Failed to toggle featured");
    }
  };

  // ✅ Load listing for editing
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

  if (!user)
    return (
      <div className="p-8 text-center text-gray-600">
        Please log in to manage your listings.
      </div>
    );

  if (!userRole)
    return (
      <div className="p-8 text-center text-gray-500 animate-pulse">
        Loading user data...
      </div>
    );

  // ✅ Render UI
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-10">
      <h1 className="text-3xl font-bold text-gray-800">
        {userRole === "admin" ? "Admin" : "Partner"} Listings Management
      </h1>

      {/* ---------- Listing Form ---------- */}
      <div className="bg-white p-6 rounded-xl shadow space-y-4 border">
        <h2 className="text-xl font-semibold">
          {editId ? "Edit Listing" : "Add New Listing"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Name"
            className="border p-2 rounded"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Location"
            className="border p-2 rounded"
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
          />
          <input
            type="number"
            placeholder="Price (per night)"
            className="border p-2 rounded"
            value={formData.price}
            onChange={(e) =>
              setFormData({ ...formData, price: e.target.value })
            }
          />
        </div>

        <textarea
          placeholder="Description"
          className="border p-2 w-full rounded min-h-[100px]"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
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

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-blue-600 text-white w-full py-3 rounded-lg mt-2"
        >
          {loading
            ? "Processing..."
            : editId
            ? "Update Listing"
            : "Add Listing"}
        </Button>
      </div>

      {/* ---------- Listings Table ---------- */}
      <div className="bg-white p-6 rounded-xl shadow border">
        <h2 className="text-xl font-semibold mb-4">Listings</h2>

        {listings.length === 0 ? (
          <p className="text-gray-500">No listings found.</p>
        ) : (
          <div className="space-y-4">
            {listings.map((l) => (
              <div
                key={l.id}
                className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-3"
              >
                <div>
                  <h3 className="font-semibold text-lg">{l.name}</h3>
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
                    </span>{" "}
                    {l.featured && (
                      <span className="ml-2 text-blue-600 font-semibold">
                        ⭐ Featured
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap mt-3 md:mt-0">
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

                  {/* Admin-only controls */}
                  {userRole === "admin" && (
                    <>
                      {l.status !== "approved" && (
                        <>
                          <Button
                            onClick={() =>
                              handleStatusChange(l.id!, "approved")
                            }
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() =>
                              handleStatusChange(l.id!, "rejected")
                            }
                            className="bg-gray-600 hover:bg-gray-700"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={() =>
                          handleToggleFeatured(l.id!, l.featured ?? false)
                        }
                        className={`${
                          l.featured
                            ? "bg-blue-500 hover:bg-blue-600"
                            : "bg-slate-700 hover:bg-slate-800"
                        }`}
                      >
                        {l.featured ? "Unmark Featured" : "Mark Featured"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
