"use client";

type NotificationItemProps = {
  title: string;
  message: string;
  time: string;
  read?: boolean;
};

export default function NotificationItem({
  title,
  message,
  time,
  read = false,
}: NotificationItemProps) {
  return (
    <div
      className={`p-4 border-b hover:bg-gray-50 transition ${
        read ? "bg-white" : "bg-blue-50"
      }`}
    >
      <h4 className="font-semibold">{title}</h4>
      <p className="text-sm text-gray-600">{message}</p>
      <span className="text-xs text-gray-400">{time}</span>
    </div>
  );
}
