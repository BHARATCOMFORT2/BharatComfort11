"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";

interface Message {
  id: string;
  text: string;
  sender: string;
  createdAt: any; // you can refine with Firestore Timestamp type if needed
}

export default function ChatPage(): JSX.Element {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const otherUserId = searchParams.get("user");
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!user || !otherUserId) return;

    // query messages between current user and other user
    const q = query(
      collection(db, "messages"),
      where("participants", "array-contains", user.uid),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = snapshot.docs.map((doc) => ({
        ...(doc.data() as Omit<Message, "id">), // spread data except id
        id: doc.id, // ensure doc.id wins
      }));
      setMessages(msgs);
    });

    return () => unsub();
  }, [user, otherUserId]);

  if (!user) {
    return <p className="p-4">Please log in to see your chat.</p>;
  }

  if (!otherUserId) {
    return <p className="p-4">Select a user to start chatting.</p>;
  }

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
              {msg.createdAt?.toDate
                ? msg.createdAt.toDate().toLocaleString()
                : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
