// hooks/useChat.ts
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Chat {
  id: string;
  participants: string[]; // userIds of sender & receiver
  createdAt: any;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: any;
  read: boolean;
}

/**
 * Hook for fetching all chats of a user (either as sender or receiver).
 */
export function useChats(userId: string | null) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", userId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Chat)
      );
      setChats(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { chats, loading };
}

/**
 * Hook for fetching messages inside a specific chat.
 */
export function useMessages(chatId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Message)
      );
      setMessages(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId]);

  return { messages, loading };
}
