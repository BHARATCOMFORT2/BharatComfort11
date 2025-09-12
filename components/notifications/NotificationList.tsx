"use client";

import NotificationItem from "./NotificationItem";

type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  read?: boolean;
};

type NotificationListProps = {
  notifications: Notification[];
};

export default function NotificationList({ notifications }: NotificationListProps) {
  if (!notifications || notifications.length === 0) {
    return <p className="text-center text-gray-500 py-6">No notifications yet.</p>;
  }

  return (
    <div className="divide-y border rounded-lg shadow bg-white">
      {notifications.map((n) => (
        <NotificationItem
          key={n.id}
          title={n.title}
          message={n.message}
          time={n.time}
          read={n.read}
        />
      ))}
    </div>
  );
}
