"use client";

import { useState } from "react";
import NotificationList from "./NotificationList";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);

  // Mock notifications
  const notifications = [
    {
      id: "1",
      title: "🔥 Trending Listing",
      message: "A new hotel is trending in Goa!",
      time: "2h ago",
      read: false,
    },
    {
      id: "2",
      title: "💸 Special Offer",
      message: "Flat 20% discount on partner restaurants.",
      time: "1d ago",
      read: true,
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-gray-100"
      >
        🔔
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 rounded-full">
          {notifications.filter((n) => !n.read).length}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50">
          <NotificationList notifications={notifications} />
        </div>
      )}
    </div>
  );
}
