// app/chat/[chatid]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export default function ChatPage() {
  const { chatid } = useParams(); // dynamic route param
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (!chatid) return;

    const messagesRef = collection(db, "chats", chatid as string, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [chatid]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (!auth.currentUser) return alert("You must be logged in to chat");

    const messagesRef = collection(db, "chats", chatid as string, "messages");

    await addDoc(messagesRef, {
      text: newMessage,
      uid: auth.currentUser.uid,
      displayName: auth.currentUser.displayName || "Anonymous",
      createdAt: serverTimestamp(),
    });

    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Chat Header */}
      <div className="p-4 bg-blue-600 text-white font-bold">Chat Room</div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-2 rounded-lg max-w-xs ${
              msg.uid === auth.currentUser?.uid
                ? "bg-blue-500 text-white ml-auto"
                : "bg-gray-200 text-black"
            }`}
          >
            <p className="text-sm font-semibold">{msg.displayName}</p>
            <p>{msg.text}</p>
          </div>
        ))}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="p-4 flex gap-2 bg-white border-t">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border rounded-lg px-3 py-2"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Send
        </button>
      </form>
    </div>
  );
}
