// lib/notifications.ts
import { db } from "./firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
} from "firebase/firestore";

/**
 * Create a notification for a single user
 */
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: "info" | "offer" | "booking" | "system" = "info"
) {
  const notificationsRef = collection(db, "notifications");

  await addDoc(notificationsRef, {
    userId,
    title,
    message,
    type,
    read: false,
    createdAt: serverTimestamp(),
  });
}

/**
 * Broadcast a notification to ALL users
 */
export async function broadcastNotification(
  title: string,
  message: string,
  type: "info" | "offer" | "system" = "system"
) {
  // Assuming you store users in Firestore under "users" collection
  const usersRef = collection(db, "users");
  const usersSnapshot = await getDocs(usersRef);

  const notificationsRef = collection(db, "notifications");

  const batchPromises = usersSnapshot.docs.map((userDoc) =>
    addDoc(notificationsRef, {
      userId: userDoc.id,
      title,
      message,
      type,
      read: false,
      createdAt: serverTimestamp(),
    })
  );

  await Promise.all(batchPromises);
}

/**
 * Subscribe to notifications for a user
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notifications: any[]) => void
) {
  const notificationsRef = collection(db, "notifications");
  const q = query(
    notificationsRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(data);
  });
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string) {
  const notificationRef = doc(db, "notifications", notificationId);

  await updateDoc(notificationRef, {
    read: true,
  });
}
