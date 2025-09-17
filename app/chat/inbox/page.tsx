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

interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: string;
  updatedAt?: any;
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const router = useRouter();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const convRef = collection(db, "conversations");
    const q = query(
      convRef,
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const convs: Conversation[] = snapshot.docs.map((doc) => ({
        doc.id,
        ...(doc.data() as Conversation),
      }));
      setConversations(convs);
    });

    return () => unsub();
  }, [router]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">📨 Inbox</h1>

      {conversations.length === 0 ? (
        <p className="text-gray-500">No conversations yet.</p>
      ) : (
        <ul className="space-y-4">
          {conversations.map((conv) => {
            const otherId = conv.participants.find(
              (p) => p !== auth.currentUser?.uid
            );

            return (
              <li
                key={conv.id}
                onClick={() => router.push(`/chat/${conv.id}`)}
                className="p-4 bg-white rounded-lg shadow hover:bg-gray-50 cursor-pointer"
              >
                <div className="font-semibold">
                  Chat with {otherId || "Unknown"}
                </div>
                <div className="text-sm text-gray-600">
                  {conv.lastMessage || "No messages yet"}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {conv.updatedAt?.toDate
                    ? conv.updatedAt.toDate().toLocaleString()
                    : ""}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
