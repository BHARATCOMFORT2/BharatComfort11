"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail, updateProfile } from "firebase/auth";

export default function UserDashboardPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile state
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push("/auth/login");
        return;
      }

      try {
        // Prefill profile details
        setDisplayName(user.displayName || "");
        setEmail(user.email || "");

        // Fetch user bookings
        const bookingsQuery = query(
          collection(db, "bookings"),
          where("userId", "==", user.uid)
        );
        const bookingsSnap = await getDocs(bookingsQuery);
        const bookingsList: any[] = [];
        bookingsSnap.forEach((doc) => bookingsList.push({ id: doc.id, ...doc.data() }));
        setBookings(bookingsList);

        // Fetch notifications
        const notifQuery = query(
          collection(db, "notifications"),
          where("userId", "in", [user.uid, "all"])
        );
        const notifSnap = await getDocs(notifQuery);
        const notifList: any[] = [];
        notifSnap.forEach((doc) => notifList.push({ id: doc.id, ...doc.data() }));
        setNotifications(notifList);
      } catch (err) {
        console.error("Error loading dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateProfile(user, { displayName });
      // optionally sync to Firestore "users" collection
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, { displayName });

      setProfileMsg("Profile updated successfully ✅");
    } catch (err: any) {
      setProfileMsg("Error: " + err.message);
    }
  };

  const handlePasswordReset = async () => {
    const user = auth.currentUser;
    if (!user?.email) return;

    try {
      await sendPasswordResetEmail(auth, user.email);
      setProfileMsg("Password reset email sent 📩");
    } catch (err: any) {
      setProfileMsg("Error: " + err.message);
    }
  };

  if (loading) return <p className="text-center py-12">Loading...</p>;

  return (
    <div className="container mx-auto px-4 py-12 space-y-10">
      <h1 className="text-2xl font-bold mb-6">My Dashboard</h1>

      {/* Profile Settings */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Profile Settings</h2>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Full Name"
            className="w-full p-3 border rounded"
          />
          <input
            type="email"
            value={email}
            disabled
            className="w-full p-3 border rounded bg-gray-100 cursor-not-allowed"
          />
          <div className="flex gap-4">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={handlePasswordReset}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Reset Password
            </button>
          </div>
        </form>
        {profileMsg && <p className="mt-3 text-sm text-green-600">{profileMsg}</p>}
      </div>

      {/* Notifications */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Notifications</h2>
        {notifications.length > 0 ? (
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li
                key={n.id}
                className="p-3 border rounded bg-gray-50 hover:bg-gray-100"
              >
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-gray-600">{n.message}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No new notifications</p>
        )}
      </div>

      {/* Bookings */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">My Bookings</h2>
        {bookings.length > 0 ? (
          <ul className="space-y-3">
            {bookings.map((b) => (
              <li
                key={b.id}
                className="p-3 border rounded bg-gray-50 hover:bg-gray-100"
              >
                <p className="font-medium">{b.listingTitle}</p>
                <p className="text-sm text-gray-600">
                  {b.date} • {b.status}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">You have no bookings yet</p>
        )}
      </div>
    </div>
  );
}
