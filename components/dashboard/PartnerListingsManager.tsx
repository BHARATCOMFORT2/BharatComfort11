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

export default function PartnerListingsManager() {
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

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user?.uid) {
        const refUser = doc(db, "users", user.uid);
        const snap = await getDoc(refUser);
        if (snap.exists()) setUserRole(snap.data().role || "partner");
      }
    };
    fetchUserRole();
  }, [user]);

  // Real-time listings
  useEffect(() => {
    if (!user || !userRole) return;
    const q =
      userRole === "admin"
        ? query(collection(db, "listings"), orderBy("createdAt", "desc"))
        : query(
            collection(db, "listings"),
            where("createdBy", "==", user.uid),
            orderBy("createdAt", "desc")
          );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Listing),
      }));
      setListings(data);
    });
    return () => unsubscribe();
  }, [user, userRole]);

  // Upload images
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

  // Add or edit listing
  const handleSubmit = async () => {
    if (!user) return alert("Please login");
    setLoading(true);
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
        status: userRole === "admin" ? "approved" : "pending",
        featured: false,
        createdAt: serverTimestamp(),
      };
      if (editId) {
        await updateDoc(doc(db, "listings", editId), data);
        alert("✅ Listing updated!");
        setEditId(null);
      } else {
        await addDoc(collection(db, "listings"), data);
        alert("✅ Listing added!");
      }
      setFormData({
        name: "",
        description: "",
        location: "",
        price: "",
        images: [],
      });
    } catch (err) {
      console.error(err);
      alert("❌ Error saving listing");
    } finally {
      setLoading(false);
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    await deleteDoc(doc(db, "listings", id));
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

  if (!user || !userRole)
    return <p className="text-gray-500">Loading listings...</p>;

  return (
    <div className="space-y-8">
      {/* Listing Form */}
      <div className="bg-white p-6 rounded-xl shadow space-y-4 border">
        <h2 className="text-xl font-semibold">
          {editId ? "Edit Listing" : "Add New Listing"}
        </h2>

        <input
          placeholder="Name"
          className="border p-2 w-full rounded"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <input
          placeholder="Location"
          className="border p-2 w-full rounded"
          value={formData.location}
          onChange={(e) =>
            setFormData({ ...formData, location: e.target.value })
          }
        />
        <input
          placeholder="Price"
          type="number"
          className="border p-2 w-full rounded"
          value={formData.price}
          onChange={(e) =>
            setFormData({ ...formData, price: e.target.value })
          }
        />
        <textarea
          placeholder="Description"
          className="border p-2 w-full rounded"
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
          className="bg-blue-600 text-white w-full py-3 rounded-lg"
        >
          {loading ? "Processing..." : editId ? "Update Listing" : "Add Listing"}
        </Button>
      </div>

      {/* Listing Table */}
      <div className="bg-white p-6 rounded-xl shadow border">
        <h2 className="text-xl font-semibold mb-4">Your Listings</h2>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
