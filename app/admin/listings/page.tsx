"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";

export default function AdminListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchListings = async () => {
    try {
      const snap = await getDocs(collection(db, "listings"));
      const list: any[] = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setListings(list);
    } catch (err) {
      console.error("Error fetching listings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push("/auth/login");
      return;
    }
    // TODO: enforce superadmin check
    fetchListings();
  }, [router]);

  const removeListing = async (id: string) => {
    try {
      await deleteDoc(doc(db, "listings", id));
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error("Error deleting listing:", err);
    }
  };

  const changeStatus = async (id: string, status: string) => {
    try {
      const ref = doc(db, "listings", id);
      await updateDoc(ref, { status });
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status } : l))
      );
    } catch (err) {
      console.error("Error updating listing status:", err);
    }
  };

  if (loading) return <p className="text-center py-12">Loading listings...</p>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Manage Listings</h1>

      {listings.length > 0 ? (
        <table className="w-full border-collapse border rounded-lg overflow-hidden shadow">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2 text-left">Title</th>
              <th className="border px-4 py-2 text-left">Partner</th>
              <th className="border px-4 py-2 text-left">Location</th>
              <th className="border px-4 py-2 text-left">Status</th>
              <th className="border px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((listing) => (
              <tr key={listing.id} className="bg-white hover:bg-gray-50">
                <td className="border px-4 py-2">{listing.title}</td>
                <td className="border px-4 py-2">{listing.partnerName || "—"}</td>
                <td className="border px-4 py-2">{listing.location}</td>
                <td className="border px-4 py-2">
                  <select
                    value={listing.status || "pending"}
                    onChange={(e) => changeStatus(listing.id, e.target.value)}
                    className="border px-2 py-1 rounded"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </td>
                <td className="border px-4 py-2 text-center">
                  <button
                    onClick={() => router.push(`/listings/${listing.id}`)}
                    className="text-blue-600 hover:underline text-sm mr-4"
                  >
                    View
                  </button>
                  <button
                    onClick={() => removeListing(listing.id)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-500">No listings found.</p>
      )}
    </div>
  );
}
