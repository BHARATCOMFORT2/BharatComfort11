"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function UserNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push("/auth/login");
        return;
      }

      try {
        const notifQuery = query(
          collection(db, "notifications"),
          where("userId", "in", [user.uid, "all"]),
          orderBy("createdAt", "desc")
        );

        const snap = await getDocs(notifQuery);
        const notifList: any[] = [];
        snap.forEach((doc) => notifList.push({ id: doc.id, ...doc.data() }));
        setNotifications(notifList);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [router]);

  if (loading) return <p className="text-center py-12">Loading...</p>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>

      {notifications.length > 0 ? (
        <ul className="space-y-4">
          {notifications.map((n) => (
            <li
              key={n.id}
              className="p-4 border rounded-lg bg-white shadow hover:bg-gray-50"
            >
              <div className="flex justify-between items-center">
                <h2 className="font-semibold">{n.title}</h2>
                <span className="text-xs text-gray-500">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-gray-700 mt-1">{n.message}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No notifications yet 🎉</p>
      )}
    </div>
  );
}
