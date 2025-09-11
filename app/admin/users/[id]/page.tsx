"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

export default function AdminUserDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserDetails = async () => {
    try {
      // user info
      const userSnap = await getDoc(doc(db, "users", id as string));
      if (userSnap.exists()) {
        setUserData({ id: userSnap.id, ...userSnap.data() });
      }

      // favorites
      const favQ = query(
        collection(db, "favorites"),
        where("userId", "==", id)
      );
      const favSnap = await getDocs(favQ);
      const favList: any[] = [];
      favSnap.forEach((d) => favList.push({ id: d.id, ...d.data() }));
      setFavorites(favList);

      // bookings
      const bookingQ = query(
        collection(db, "bookings"),
        where("userId", "==", id)
      );
      const bookingSnap = await getDocs(bookingQ);
      const bookingList: any[] = [];
      bookingSnap.forEach((d) => bookingList.push({ id: d.id, ...d.data() }));
      setBookings(bookingList);
    } catch (err) {
      console.error("Error fetching user details:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (status: string) => {
    try {
      await updateDoc(doc(db, "users", id as string), { status });
      setUserData((prev: any) => ({ ...prev, status }));
    } catch (err) {
      console.error("Error updating user status:", err);
    }
  };

  const updateUserRole = async (role: string) => {
    try {
      await updateDoc(doc(db, "users", id as string), { role });
      setUserData((prev: any) => ({ ...prev, role }));
    } catch (err) {
      console.error("Error updating user role:", err);
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push("/auth/login");
      return;
    }
    // TODO: enforce superadmin role check
    fetchUserDetails();
  }, [id, router]);

  if (loading) return <p className="text-center py-12">Loading...</p>;
  if (!userData) return <p className="text-center py-12">User not found.</p>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">User Details</h1>

      <div className="mb-6 border rounded-lg shadow p-4 bg-white">
        <h2 className="text-lg font-semibold">{userData.name}</h2>
        <p className="text-gray-600">{userData.email}</p>
        <p className="text-gray-600">Phone: {userData.phone || "N/A"}</p>
        <div className="mt-2">
          <label className="font-medium mr-2">Role:</label>
          <select
            value={userData.role || "user"}
            onChange={(e) => updateUserRole(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            <option value="user">User</option>
            <option value="partner">Partner</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="mt-2">
          <label className="font-medium mr-2">Status:</label>
          <select
            value={userData.status || "active"}
            onChange={(e) => updateUserStatus(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4">Favorites</h2>
      {favorites.length > 0 ? (
        <ul className="list-disc list-inside mb-6">
          {favorites.map((fav) => (
            <li key={fav.id}>
              {fav.listingTitle || "Unknown Listing"}{" "}
              <button
                onClick={() => router.push(`/listings/${fav.listingId}`)}
                className="text-blue-600 hover:underline text-sm ml-2"
              >
                View
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 mb-6">No favorites found.</p>
      )}

      <h2 className="text-xl font-bold mb-4">Bookings</h2>
      {bookings.length > 0 ? (
        <ul className="list-disc list-inside">
          {bookings.map((b) => (
            <li key={b.id}>
              {b.listingTitle || "Unknown Listing"} – {b.status || "Pending"}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No bookings found.</p>
      )}
    </div>
  );
}
