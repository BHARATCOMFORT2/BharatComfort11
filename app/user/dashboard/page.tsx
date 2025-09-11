"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function UserDashboardPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push("/auth/login");
        return;
      }

      try {
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
          where("userId", "in", [user.uid, "all"]) // personal + global notifications
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

  if (loading) return <p className="text-center py-12">Loading...</p>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">My Dashboard</h1>

      {/* Notifications */}
      <div className="bg-white p-6 rounded-lg shadow mb-10">
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
