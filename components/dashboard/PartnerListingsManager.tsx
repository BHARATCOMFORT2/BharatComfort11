"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase-client";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/Button";

/* =====================================================
   TYPES
===================================================== */

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

type Pricing = {
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
  pricing: Pricing;
  availability: AvailabilityDay[];
};

type Listing = {
  id: string;
  title: string;
  location: string;
  status: ListingStatus;
  rejectionReason?: string;
  rooms: Room[];
  images: string[];
};

/* =====================================================
   HELPERS
===================================================== */

const todayPlus = (i: number) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return d.toISOString().split("T")[0];
};

const isWeekend = (d: Date) => {
  const day = d.getDay();
  return day === 0 || day === 6;
};

const calcPrice = (
  pricing: Pricing,
  date: Date,
  festival = false
) => {
  let price = pricing.basePrice;

  if (festival && pricing.festivalPrice)
    price = pricing.festivalPrice;
  else if (isWeekend(date) && pricing.weekendPrice)
    price = pricing.weekendPrice;

  if (pricing.discountPercent)
    price -= Math.round(
      (price * pricing.discountPercent) / 100
    );

  return price;
};

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function PartnerListingsManager() {
  /* ---------------- STATE ---------------- */
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);

  const [editingListing, setEditingListing] =
    useState<Listing | null>(null);

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");

  const [rooms, setRooms] = useState<Room[]>([]);
  const [images, setImages] = useState<string[]>([]);

  const [roomDraft, setRoomDraft] = useState<Omit<Room, "id">>({
    name: "",
    totalRooms: 1,
    maxGuests: 2,
    pricing: {
      basePrice: 1000,
      minStayNights: 1,
    },
    availability: [],
  });

  const [pricingRoom, setPricingRoom] =
    useState<Room | null>(null);
  const [availabilityRoom, setAvailabilityRoom] =
    useState<Room | null>(null);

  const [previewDate, setPreviewDate] = useState(
    todayPlus(0)
  );
  const [festivalMode, setFestivalMode] = useState(false);

  /* ---------------- LOAD ---------------- */

  useEffect(() => {
    if (!auth) return;

    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setLoading(false);
        return;
      }
      await u.getIdToken(true);
      await loadListings();
      setLoading(false);
    });

    return () => unsub && unsub();
  }, []);

  async function loadListings() {
    const res = await apiFetch("/api/partners/listings/list");
    const j = await res.json();
    setListings(Array.isArray(j.listings) ? j.listings : []);
  }

  /* =====================================================
     LISTING CRUD
  ===================================================== */

  async function saveListing() {
    const endpoint = editingListing?.id
      ? "/api/partners/listings/update"
      : "/api/partners/listings/create";

    await apiFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingListing?.id,
        title,
        location,
        rooms,
        images,
      }),
    });

    resetForm();
    loadListings();
  }

  async function deleteListing(id: string) {
    if (!confirm("Delete listing?")) return;

    await apiFetch("/api/partners/listings/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    loadListings();
  }

  async function submitListing(id: string) {
    await apiFetch("/api/partners/listings/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadListings();
  }

  function resetForm() {
    setEditingListing(null);
    setTitle("");
    setLocation("");
    setRooms([]);
    setImages([]);
  }

  /* =====================================================
     ROOMS
  ===================================================== */

  function addRoom() {
    setRooms([
      ...rooms,
      { ...roomDraft, id: crypto.randomUUID() },
    ]);
    setRoomDraft({
      name: "",
      totalRooms: 1,
      maxGuests: 2,
      pricing: {
        basePrice: 1000,
        minStayNights: 1,
      },
      availability: [],
    });
  }

  function removeRoom(id: string) {
    setRooms(rooms.filter((r) => r.id !== id));
  }

  /* =====================================================
     IMAGES
  ===================================================== */

  async function uploadImages(files: FileList | null) {
    if (!files) return;
    const uploaded: string[] = [];

    for (const f of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", f);
      const res = await apiFetch(
        "/api/partners/listings/images/upload",
        { method: "POST", body: fd }
      );
      const j = await res.json();
      if (j.url) uploaded.push(j.url);
    }

    setImages([...images, ...uploaded]);
  }

  /* =====================================================
     UI
  ===================================================== */

  if (loading)
    return <div className="p-6">Loading…</div>;

  return (
    <div className="space-y-6">
      {/* ADD */}
      <div className="flex justify-end">
        <Button onClick={() => setEditingListing({} as any)}>
          ➕ Add Listing
        </Button>
      </div>

      {/* CREATE / EDIT */}
      {editingListing && (
        <div className="bg-white p-6 border rounded space-y-4">
          <h2 className="font-bold">
            {editingListing.id ? "Edit" : "New"} Listing
          </h2>

          <input
            className="border p-2 w-full"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <input
            className="border p-2 w-full"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          {/* ROOMS */}
          <div className="border p-4 rounded">
            <h3 className="font-semibold mb-2">Rooms</h3>

            {rooms.map((r) => (
              <div
                key={r.id}
                className="flex justify-between mb-1"
              >
                {r.name} ₹{r.pricing.basePrice}
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    onClick={() => setPricingRoom(r)}
                  >
                    Pricing
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setAvailabilityRoom(r)}
                  >
                    Availability
                  </Button>
                  <button onClick={() => removeRoom(r.id)}>
                    ❌
                  </button>
                </div>
              </div>
            ))}

            <div className="grid grid-cols-4 gap-2 mt-2">
              <input
                placeholder="Room name"
                className="border p-1"
                value={roomDraft.name}
                onChange={(e) =>
                  setRoomDraft({
                    ...roomDraft,
                    name: e.target.value,
                  })
                }
              />
              <input
                type="number"
                className="border p-1"
                placeholder="Rooms"
                value={roomDraft.totalRooms}
                onChange={(e) =>
                  setRoomDraft({
                    ...roomDraft,
                    totalRooms: +e.target.value,
                  })
                }
              />
              <input
                type="number"
                className="border p-1"
                placeholder="Guests"
                value={roomDraft.maxGuests}
                onChange={(e) =>
                  setRoomDraft({
                    ...roomDraft,
                    maxGuests: +e.target.value,
                  })
                }
              />
              <input
                type="number"
                className="border p-1"
                placeholder="Base price"
                value={roomDraft.pricing.basePrice}
                onChange={(e) =>
                  setRoomDraft({
                    ...roomDraft,
                    pricing: {
                      ...roomDraft.pricing,
                      basePrice: +e.target.value,
                    },
                  })
                }
              />
            </div>

            <Button className="mt-2" onClick={addRoom}>
              ➕ Add Room
            </Button>
          </div>

          {/* IMAGES */}
          <div>
            <input
              type="file"
              multiple
              onChange={(e) =>
                uploadImages(e.target.files)
              }
            />
            <div className="flex gap-2 mt-2 flex-wrap">
              {images.map((i) => (
                <img
                  key={i}
                  src={i}
                  className="w-20 h-20 object-cover rounded"
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={saveListing}>Save</Button>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* LISTINGS */}
      {listings.map((l) => (
        <div key={l.id} className="border p-4 rounded">
          <div className="flex justify-between">
            <div>
              <b>{l.title}</b>
              <div className="text-sm">{l.location}</div>
              <div className="text-xs">
                Status: {l.status}
              </div>
            </div>
            <div className="flex gap-2">
              {(l.status === "DRAFT" ||
                l.status === "REJECTED") && (
                <Button onClick={() => submitListing(l.id)}>
                  Submit
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setEditingListing(l);
                  setTitle(l.title);
                  setLocation(l.location);
                  setRooms(l.rooms || []);
                  setImages(l.images || []);
                }}
              >
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => deleteListing(l.id)}
              >
                Delete
              </Button>
            </div>
          </div>

          {l.status === "REJECTED" &&
            l.rejectionReason && (
              <div className="text-red-600 text-sm">
                ❌ {l.rejectionReason}
              </div>
            )}
        </div>
      ))}
    </div>
  );
}
