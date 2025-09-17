// app/chat/inbox/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  DocumentData,
} from "firebase/firestore";
import Link from "next/link";

interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: string;
  updatedAt?: Date | null;
}

export default function InboxPage() {
  const { firebaseUser: user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
}

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const convs: Conversation[] = snapshot.docs.map((doc) => {
        const data = doc.data() as DocumentData;
        return {
          id: doc.id,
          participants: data.participants || [],
          lastMessage: data.lastMessage || "",
          updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
        };
      });
      setConversations(convs);
      setLoading(false); // ✅ stop loading once data arrives
    });

  // ✅ This return check must be at the top-level, not inside useEffect
  if (!user) {
    return <p className="p-4">Please log in to see your inbox.</p>;
  }
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Inbox</h1>

      {loading ? (
        <p>Loading conversations...</p> // ✅ loading state
      ) : conversations.length === 0 ? (
        <p>No conversations yet.</p>
      ) : (
        <ul className="space-y-3">
          {conversations.map((chat) => {
            const otherUser = chat.participants.find((p) => p !== user.uid);
            return (
              <li
                key={chat.id}
                className="p-3 rounded-lg border hover:bg-gray-50 transition"
              >
                <Link href={`/chat/${chat.id}`} className="block">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{otherUser || "Unknown User"}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {chat.lastMessage}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {chat.updatedAt
                        ? chat.updatedAt.toLocaleString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "numeric",
                            month: "short",
                          })
                        : ""}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
    }
