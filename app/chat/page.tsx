'use client';

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  id: string;
  text: string;
  sender: string;
  createdAt: Timestamp | null;
}

export default function ChatPage() {
  const { firebaseUser: user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Only run client-side logic
  useEffect(() => {
    setMounted(true);

    // Grab userId from URL query params safely
    const params = new URLSearchParams(window.location.search);
    const otherUser = params.get("user");
    setOtherUserId(otherUser);

    if (!user || !otherUser) return;

    const q = query(
      collection(db, "messages"),
      where("participants", "array-contains", user.uid),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = snapshot.docs.map((doc) => ({
        ...(doc.data() as Omit<Message, "id">),
        id: doc.id,
        createdAt: (doc.data() as any).createdAt || null,
      }));
      setMessages(msgs);
    });

    return () => unsub();
  }, [user]);

  if (!mounted) return null; // wait for client mount
  if (!user) return <p className="p-4">Please log in to see your chat.</p>;
  if (!otherUserId) return <p className="p-4">Select a user to start chatting.</p>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Chat with {otherUserId}</h1>
      <ul className="space-y-2">
        {messages.map((msg) => (
          <li
            key={msg.id}
            className={`p-2 rounded-md ${
              msg.sender === user.uid ? "bg-blue-200" : "bg-gray-200"
            }`}
          >
            <p>{msg.text}</p>
            <span className="text-xs text-gray-500">
              {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleString() : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
