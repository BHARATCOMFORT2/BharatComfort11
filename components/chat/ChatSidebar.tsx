"use client";

type Chat = {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread?: number;
};

type ChatSidebarProps = {
  chats: Chat[];
  activeChatId: string | null;
  onSelect: (chatId: string) => void;
};

export default function ChatSidebar({
  chats,
  activeChatId,
  onSelect,
}: ChatSidebarProps) {
  return (
    <aside className="w-72 border-r h-full bg-white shadow-sm">
      <h2 className="p-4 font-semibold text-lg border-b">Chats</h2>
      <ul className="divide-y">
        {chats.length === 0 ? (
          <li className="p-4 text-gray-600">No conversations yet.</li>
        ) : (
          chats.map((chat) => (
            <li
              key={chat.id}
              onClick={() => onSelect(chat.id)}
              className={`p-4 cursor-pointer hover:bg-gray-100 ${
                activeChatId === chat.id ? "bg-blue-50" : ""
              }`}
            >
              <div className="flex justify-between items-center">
                <p className="font-medium">{chat.name}</p>
                <span className="text-xs text-gray-500">{chat.timestamp}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <p className="text-sm text-gray-600 truncate">
                  {chat.lastMessage}
                </p>
                {chat.unread && chat.unread > 0 && (
                  <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {chat.unread}
                  </span>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}
