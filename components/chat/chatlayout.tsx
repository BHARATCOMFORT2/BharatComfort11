"use client";

import { useState } from "react";
import ChatSidebar from "@/components/chat/Chatsidebar";
import ChatWindow from "@/components/chat/Chatwindow";

type Message = {
  id: string;
  sender: "me" | "other";
  text: string;
  timestamp: string;
};

type Chat = {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread?: number;
  messages: Message[];
};

type ChatLayoutProps = {
  chats: Chat[];
};

export default function ChatLayout({ chats }: ChatLayoutProps) {
  const [activeChatId, setActiveChatId] = useState<string | null>(
    chats.length > 0 ? chats[0].id : null
  );

  const activeChat = chats.find((c) => c.id === activeChatId);

  const handleSend = (text: string) => {
    console.log("Send message:", text);
    // Here you’d call Firebase/Socket API to send message
  };

  return (
    <div className="flex h-[80vh] border rounded-lg overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelect={setActiveChatId}
      />

      {/* Chat window */}
      <div className="flex-1">
        {activeChat ? (
          <ChatWindow messages={activeChat.messages} onSend={handleSend} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
