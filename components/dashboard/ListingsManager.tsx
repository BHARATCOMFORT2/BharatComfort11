"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

/* Drag & Drop Images */
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ================= TYPES ================= */

type ListingStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "DISABLED";

type RoomPricing = {
  basePrice: number;
  weekendPrice?: number;
  festivalPrice?: number;
  discountPercent?: number;
  minStayNights: number;
};

type AvailabilityDay = {
  date: string;
  blocked: boolean;
};

type Room = {
  id: string;
  name: string;
  totalRooms: number;
  maxGuests: number;
  pricing: RoomPricing;
  availability: AvailabilityDay[];
};

type ListingStats = {
  views: number;
  bookings: number;
};

type Listing = {
  id: string;
  title: string;
  location: string;
  description: string;
  images: string[];
  status: ListingStatus;
  rejectionReason?: string;
  rooms: Room[];
  stats?: ListingStats;
};

/* ================= HELPERS ================= */

function SortableImage({ id, url }: { id: string; url: string }) {
  const { setNodeRef, attributes, listeners, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <img
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      src={url}
      style={style}
      className="w-24 h-24 rounded object-cover cursor-move border"
    />
  );
}

function conversion(views = 0, bookings = 0) {
  if (!views) return "0%";
  return `${Math.round((bookings / views) * 100)}%`;
}

/* ================= MAIN ================= */

export default function AdminListingsManager() {
  const { firebaseUser, profile } = useAuth();

  const [listings, setListings] = useState<Listing[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  /* ---------------- LOAD ---------------- */

  const loadListings = async () => {
    const res = await fetch("/api/admin/listings", {
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) setListings(data.listings || []);
  };

  useEffect(() => {
    loadListings();
  }, []);

  /* ---------------- ADMIN ACTIONS ---------------- */

  async function approveListing(id: string) {
    setBusyId(id);
    await fetch("/api/admin/listings/approve", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: id }),
    });
    loadListings();
    setBusyId(null);
  }

  async function rejectListing(id: string) {
    const reason = prompt("Rejection reason?");
    if (!reason) return;

    setBusyId(id);
    await fetch("/api/admin/listings/reject", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: id, reason }),
    });
    loadListings();
    setBusyId(null);
  }

  async function disableListing(id: string) {
    setBusyId(id);
    await fetch("/api/partners/listings/disable", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadListings();
    setBusyId(null);
  }

  async function enableListing(id: string) {
    setBusyId(id);
    await fetch("/api/partners/listings/enable", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadListings();
    setBusyId(null);
  }

  /* ================= UI ================= */

  if (!firebaseUser) return <p>Please login</p>;

  return (
    <div className="space-y-6">
      {listings.map((l) => (
        <div
          key={l.id}
          className="bg-white p-6 rounded-xl border shadow"
        >
          {/* HEADER */}
          <div className="flex justify-between">
            <div>
              <h2 className="font-bold text-lg">{l.title}</h2>
              <p className="text-sm text-gray-500">{l.location}</p>
              <p className="text-xs mt-1">
                Status: <b>{l.status}</b>
              </p>
            </div>

            <div className="flex gap-2">
              {l.status === "SUBMITTED" && (
                <>
                  <Button onClick={() => approveListing(l.id)}>
                    Approve
                  </Button>
                  <Button onClick={() => rejectListing(l.id)}>
                    Reject
                  </Button>
                </>
              )}

              {l.status !== "DISABLED" ? (
                <Button
                  variant="outline"
                  onClick={() => disableListing(l.id)}
                >
                  Disable
                </Button>
              ) : (
                <Button onClick={() => enableListing(l.id)}>
                  Enable
                </Button>
              )}
            </div>
          </div>

          {/* REJECTION */}
          {l.status === "REJECTED" && l.rejectionReason && (
            <div className="mt-2 text-red-600 text-sm">
              ❌ {l.rejectionReason}
            </div>
          )}

          {/* PERFORMANCE */}
          <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
            <div>👀 {l.stats?.views || 0} Views</div>
            <div>📆 {l.stats?.bookings || 0} Bookings</div>
            <div>
              🔁 {conversion(l.stats?.views, l.stats?.bookings)}
            </div>
          </div>

          {/* ROOMS */}
          <div className="mt-4 space-y-2">
            {l.rooms.map((r) => (
              <div
                key={r.id}
                className="border rounded p-3 text-sm"
              >
                🛏 {r.name} | Rooms: {r.totalRooms} | Base ₹
                {r.pricing.basePrice}
              </div>
            ))}
          </div>

          {/* IMAGES */}
          {l.images?.length > 0 && (
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={({ active, over }) => {
                if (!over || active.id === over.id) return;
                setListings((prev) =>
                  prev.map((x) =>
                    x.id === l.id
                      ? {
                          ...x,
                          images: arrayMove(
                            x.images,
                            x.images.indexOf(active.id as string),
                            x.images.indexOf(over.id as string)
                          ),
                        }
                      : x
                  )
                );
              }}
            >
              <SortableContext items={l.images}>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {l.images.map((url) => (
                    <SortableImage
                      key={url}
                      id={url}
                      url={url}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      ))}
    </div>
  );
}
