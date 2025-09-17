"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";

interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
}

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // The partner or user we’re chatting with
  const otherUserId = searchParams.get("with"); // e.g. /chat?with=abc123

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (!otherUserId) return;

    // Create/find conversation
    const convId = [user.uid, otherUserId].sort().join("_"); // deterministic id
    setConversationId(convId);

    // Ensure conversation doc exists
    const convRef = doc(db, "conversations", convId);
    setDoc(
      convRef,
      {
        participants: [user.uid, otherUserId],
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Subscribe to messages
    const msgsRef = collection(db, "conversations", convId, "messages");
    const q = query(msgsRef, orderBy("createdAt", "asc"));

   const msgs: Message[] =
  snapshot.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
  })) as Message[];
      setMessages(msgs);
    });

    return () => unsub();
  }
[router, otherUserId]);

  const sendMessage = async () => {
    const user = auth.currentUser;
    if (!user || !conversationId || !newMessage.trim()) return;

    try {
      const msgsRef = collection(
        db,
        "conversations",
        conversationId,
        "messages"
      );
      await addDoc(msgsRef, {
        senderId: user.uid,
        text: newMessage,
        createdAt: serverTimestamp(),
      });

      // Update conversation doc
      const convRef = doc(db, "conversations", conversationId);
      await setDoc(
        convRef,
        {
          lastMessage: newMessage,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  if (!otherUserId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">
          Select a user/partner to start chatting.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Chat header */}
      <div className="p-4 bg-blue-600 text-white text-lg font-bold">
        💬 Chat with {otherUserId}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMine = msg.senderId === auth.currentUser?.uid;
          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`px-4 py-2 rounded-lg max-w-xs ${
                  isMine
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-gray-200 text-gray-900 rounded-bl-none"
                }`}
              >
                <p>{msg.text}</p>
                <p className="text-xs opacity-70 mt-1">
                  {msg.createdAt?.toDate
                    ? msg.createdAt.toDate().toLocaleTimeString()
                    : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="p-4 flex gap-2 border-t bg-white">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
          placeholder="Type a message..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
