// app/chat/inbox/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: string;
  updatedAt?: Date | null;
}

export default function InboxPage(): JSX.Element {
  const { firebaseUser: user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // if not signed in, clear and bail out
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const unsub = onSnapshot(q, (snapshot) => {
      const convs: Conversation[] = snapshot.docs.map((doc) => {
        const data = doc.data() as DocumentData;
        return {
          id: doc.id,

            participants: (data.participants as string[]) || [],
            lastMessage: data.lastMessage ?? "",
            updatedAt: data.updatedAt
              ? // Firestore Timestamp -> Date, but be defensive
                typeof (data.updatedAt as any).toDate === "function"
                ? (data.updatedAt as any).toDate()
                : new Date(data.updatedAt)
              : null,
          } as Conversation;
        });

        setConversations(convs);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to listen to chats:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  // Top-level return checks must be OUTSIDE useEffect
  if (!user) {
    return <p className="p-4">Please log in to see your inbox.</p>;
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Inbox</h1>

      {loading ? (
        <p>Loading conversations...</p>
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
                      <p className="font-medium">{otherUser ?? "Unknown User"}</p>
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
  )
