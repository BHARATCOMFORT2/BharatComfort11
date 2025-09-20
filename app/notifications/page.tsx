"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: string;
  message: string;
  createdAt?: any;
  read?: boolean;
  link?: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const router = useRouter();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const notifRef = collection(db, "notifications");
    const q = query(
      notifRef,
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
     const notifs: Notification[] = snapshot.docs.map((doc) => ({
  ...(doc.data() as Notification),
  id: doc.id, // this overrides any `id` in doc.data()
}));
  setNotifications(notifs);
    });

    return () => unsub();
  }, [router]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">🔔 Notifications</h1>

      {notifications.length === 0 ? (
        <p className="text-gray-500">No notifications yet.</p>
      ) : (
        <ul className="space-y-4">
          {notifications.map((notif) => (
            <li
              key={notif.id}
              className={`p-4 rounded-lg shadow cursor-pointer ${
                notif.read ? "bg-gray-100" : "bg-blue-50"
              }`}
              onClick={() => {
                if (notif.link) router.push(notif.link);
              }}
            >
              <div className="flex justify-between items-center">
                <p className="text-gray-800">{notif.message}</p>
                <span className="text-xs text-gray-400">
                  {notif.createdAt?.toDate
                    ? notif.createdAt.toDate().toLocaleString()
                    : ""}
                </span>
              </div>
              {notif.type && (
                <div className="text-xs text-gray-500 mt-1">
                  Type: {notif.type}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
