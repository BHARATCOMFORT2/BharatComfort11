// lib/chat.ts
import { db } from "./firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";

/**
 * Create a new chat between two users if not already exists
 */
export async function createChat(userId: string, partnerId: string) {
  const chatId = [userId, partnerId].sort().join("_");

  const chatRef = doc(db, "chats", chatId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    await setDoc(chatRef, {
      participants: [userId, partnerId],
      createdAt: serverTimestamp(),
    });
  }

  return chatId;
}

/**
 * Send a message in a chat
 */
export async function sendMessage(
  chatId: string,
  senderId: string,
  text: string
) {
  const messagesRef = collection(db, "chats", chatId, "messages");

  await addDoc(messagesRef, {
    senderId,
    text,
    createdAt: serverTimestamp(),
    read: false,
  });
}

/**
 * Subscribe to chat messages (real-time)
 */
export function subscribeToMessages(
  chatId: string,
  callback: (messages: any[]) => void
) {
  const messagesRef = collection(db, "chats", chatId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"));

  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(msgs);
  });
}
