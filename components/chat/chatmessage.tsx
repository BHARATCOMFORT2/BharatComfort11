"use client";

type ChatMessageProps = {
  sender: "me" | "other";
  text: string;
  timestamp: string;
};

export default function ChatMessage({ sender, text, timestamp }: ChatMessageProps) {
  return (
    <div
      className={`flex ${sender === "me" ? "justify-end" : "justify-start"} mb-2`}
    >
      <div
        className={`px-3 py-2 rounded-lg max-w-xs ${
          sender === "me"
            ? "bg-blue-600 text-white"
            : "bg-gray-200 text-gray-800"
        }`}
      >
        <p>{text}</p>
        <span className="block text-xs mt-1 opacity-70">{timestamp}</span>
      </div>
    </div>
  );
}
