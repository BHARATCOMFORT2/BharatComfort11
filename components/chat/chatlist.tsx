"use client";

type ChatListProps = {
  chats: {
    id: string;
    name: string;
    lastMessage: string;
    timestamp: string;
  }[];
  onSelect: (chatId: string) => void;
};

export default function ChatList({ chats, onSelect }: ChatListProps) {
  if (chats.length === 0) {
    return <p className="text-gray-600">No chats yet.</p>;
  }

  return (
    <ul className="divide-y border rounded-lg bg-white shadow">
      {chats.map((chat) => (
        <li
          key={chat.id}
          className="p-3 hover:bg-gray-100 cursor-pointer"
          onClick={() => onSelect(chat.id)}
        >
          <p className="font-medium">{chat.name}</p>
          <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
          <span className="text-xs text-gray-400">{chat.timestamp}</span>
        </li>
      ))}
    </ul>
  );
}
