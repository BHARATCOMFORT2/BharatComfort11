"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { auth } from "@/lib/firebase-client";
import { apiFetch } from "@/lib/apiFetch";

/* ========================= TYPES ========================= */

type ListingStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "DISABLED";

type AvailabilityDay = {
  date: string;
  blocked: boolean;
};

type RoomPricing = {
  basePrice: number;
  weekendPrice?: number;
  festivalPrice?: number;
  discountPercent?: number;
  minStayNights: number;
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
  status: ListingStatus;
  rejectionReason?: string;
  featured?: boolean;
  rooms: Room[];
  stats?: ListingStats;
};

/* ========================= HELPERS ========================= */

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function isWeekend(d: Date) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function calcPrice(room: Room, date: Date, festival = false) {
  let price = room.pricing.basePrice;

  if (festival && room.pricing.festivalPrice) {
    price = room.pricing.festivalPrice;
  } else if (isWeekend(date) && room.pricing.weekendPrice) {
    price = room.pricing.weekendPrice;
  }

  if (room.pricing.discountPercent) {
    price -= Math.round(
      (price * room.pricing.discountPercent) / 100
    );
  }

  return price;
}

function conversion(views = 0, bookings = 0) {
  if (!views) return "0%";
  return `${Math.round((bookings / views) * 100)}%`;
}

/* ========================= MAIN ========================= */

export default function PartnerListingsManager() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [pricingRoom, setPricingRoom] = useState<Room | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [previewDate, setPreviewDate] = useState(
    formatDate(new Date())
  );
  const [festivalMode, setFestivalMode] = useState(false);

  /* ---------------- LOAD ---------------- */

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) return;
      await u.getIdToken(true);
      loadListings();
    });
    return () => unsub();
  }, []);

  async function loadListings() {
    const res = await apiFetch("/api/partners/listings/list?limit=50");
    const j = await res.json();
    if (j.ok) setListings(j.listings || []);
  }

  /* ---------------- AVAILABILITY ---------------- */

  function toggleAvailability(room: Room, date: string) {
    const existing = room.availability.find((d) => d.date === date);
    if (existing) {
      existing.blocked = !existing.blocked;
    } else {
      room.availability.push({ date, blocked: true });
    }
    setSelectedRoom({ ...room });
  }

  async function saveAvailability() {
    if (!selectedRoom) return;
    setBusyId(selectedRoom.id);
    await apiFetch("/api/partners/listings/availability/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: selectedRoom.id,
        availability: selectedRoom.availability,
      }),
    });
    setSelectedRoom(null);
    loadListings();
    setBusyId(null);
  }

  /* ---------------- PRICING ---------------- */

  async function savePricing() {
    if (!pricingRoom) return;
    setBusyId(pricingRoom.id);
    await apiFetch("/api/partners/listings/pricing/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: pricingRoom.id,
        pricing: pricingRoom.pricing,
      }),
    });
    setPricingRoom(null);
    loadListings();
    setBusyId(null);
  }

  /* ---------------- STATUS ACTIONS ---------------- */

  async function submitListing(id: string) {
    setBusyId(id);
    await apiFetch("/api/partners/listings/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadListings();
    setBusyId(null);
  }

  async function enableListing(id: string) {
    setBusyId(id);
    await apiFetch("/api/partners/listings/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadListings();
    setBusyId(null);
  }

  async function disableListing(id: string) {
    setBusyId(id);
    await apiFetch("/api/partners/listings/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadListings();
    setBusyId(null);
  }

  async function duplicateListing(id: string) {
    setBusyId(id);
    await apiFetch("/api/partners/listings/duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadListings();
    setBusyId(null);
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="space-y-6">
      {listings.map((l) => (
        <div key={l.id} className="bg-white p-6 rounded-xl border shadow">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-bold text-lg">{l.title}</h2>
              <p className="text-sm text-gray-500">{l.location}</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded bg-gray-100">
              {l.status}
            </span>
          </div>

          {/* PERFORMANCE */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div>👀 {l.stats?.views || 0} Views</div>
            <div>📆 {l.stats?.bookings || 0} Bookings</div>
            <div>🔁 {conversion(l.stats?.views, l.stats?.bookings)}</div>
          </div>

          {/* ROOMS */}
          {l.rooms.map((r) => (
            <div key={r.id} className="mt-3 border-t pt-3">
              <div className="flex justify-between items-center">
                <div>
                  🛏 {r.name} | ₹{r.pricing.basePrice}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedRoom(r)}
                  >
                    Availability
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPricingRoom(r)}
                  >
                    Pricing
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* ACTIONS */}
          <div className="flex gap-2 justify-end mt-4">
            {l.status === "DRAFT" && (
              <Button onClick={() => submitListing(l.id)}>
                Submit
              </Button>
            )}
            {l.status === "DISABLED" ? (
              <Button onClick={() => enableListing(l.id)}>
                Enable
              </Button>
            ) : (
              <Button variant="outline" onClick={() => disableListing(l.id)}>
                Disable
              </Button>
            )}
            <Button variant="outline" onClick={() => duplicateListing(l.id)}>
              Duplicate
            </Button>
          </div>
        </div>
      ))}

      {/* PRICING MODAL */}
      {pricingRoom && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-xl">
            <h3 className="font-bold mb-4">
              Pricing – {pricingRoom.name}
            </h3>

            <input
              type="number"
              className="border p-2 w-full mb-2"
              placeholder="Base Price"
              value={pricingRoom.pricing.basePrice}
              onChange={(e) =>
                setPricingRoom({
                  ...pricingRoom,
                  pricing: {
                    ...pricingRoom.pricing,
                    basePrice: Number(e.target.value),
                  },
                })
              }
            />

            <input
              type="number"
              className="border p-2 w-full mb-2"
              placeholder="Weekend Price"
              value={pricingRoom.pricing.weekendPrice || ""}
              onChange={(e) =>
                setPricingRoom({
                  ...pricingRoom,
                  pricing: {
                    ...pricingRoom.pricing,
                    weekendPrice: Number(e.target.value),
                  },
                })
              }
            />

            <input
              type="number"
              className="border p-2 w-full mb-2"
              placeholder="Festival Price"
              value={pricingRoom.pricing.festivalPrice || ""}
              onChange={(e) =>
                setPricingRoom({
                  ...pricingRoom,
                  pricing: {
                    ...pricingRoom.pricing,
                    festivalPrice: Number(e.target.value),
                  },
                })
              }
            />

            <input
              type="number"
              className="border p-2 w-full mb-2"
              placeholder="Discount %"
              value={pricingRoom.pricing.discountPercent || ""}
              onChange={(e) =>
                setPricingRoom({
                  ...pricingRoom,
                  pricing: {
                    ...pricingRoom.pricing,
                    discountPercent: Number(e.target.value),
                  },
                })
              }
            />

            <input
              type="number"
              className="border p-2 w-full mb-4"
              placeholder="Minimum Stay Nights"
              value={pricingRoom.pricing.minStayNights}
              onChange={(e) =>
                setPricingRoom({
                  ...pricingRoom,
                  pricing: {
                    ...pricingRoom.pricing,
                    minStayNights: Number(e.target.value),
                  },
                })
              }
            />

            <div className="flex items-center gap-3 mb-4">
              <input
                type="date"
                value={previewDate}
                onChange={(e) => setPreviewDate(e.target.value)}
              />
              <label className="flex gap-1 items-center">
                <input
                  type="checkbox"
                  checked={festivalMode}
                  onChange={(e) => setFestivalMode(e.target.checked)}
                />
                Festival
              </label>
              <b>
                ₹
                {calcPrice(
                  pricingRoom,
                  new Date(previewDate),
                  festivalMode
                )}
              </b>
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={() => setPricingRoom(null)}>
                Cancel
              </Button>
              <Button onClick={savePricing}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* AVAILABILITY MODAL */}
      {selectedRoom && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-2xl">
            <h3 className="font-bold mb-3">
              Availability – {selectedRoom.name}
            </h3>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 30 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() + i);
                const date = formatDate(d);
                const blocked = selectedRoom.availability.find(
                  (x) => x.date === date && x.blocked
                );
                return (
                  <button
                    key={date}
                    onClick={() =>
                      toggleAvailability(selectedRoom, date)
                    }
                    className={`p-2 text-xs rounded ${
                      blocked
                        ? "bg-red-200"
                        : "bg-green-200"
                    }`}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={() => setSelectedRoom(null)}>
                Cancel
              </Button>
              <Button onClick={saveAvailability}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
