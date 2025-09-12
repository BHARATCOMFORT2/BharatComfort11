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
} from "firebase/firestore";

/**
 * Create a notification for a user
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
