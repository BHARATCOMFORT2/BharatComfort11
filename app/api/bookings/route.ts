export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/universal-wrapper";
import { FieldValue } from "firebase-admin/firestore";

const COMMISSION_RATE = 0.06;

/* ---------------------------------------------------------
GET — Fetch Bookings
--------------------------------------------------------- */

export const GET = withAuth(
async (req, ctx) => {

const { adminDb, decoded } = ctx;

if (!decoded) {
  return NextResponse.json(
    { success: false, error: "Not authenticated" },
    { status: 401 }
  );
}

const uid = decoded.uid;

const role =
  decoded.role ||
  (decoded.admin ? "admin" : decoded.partner ? "partner" : "user");

let q;

if (role === "admin") {
  q = adminDb.collection("bookings").orderBy("createdAt", "desc");
} else if (role === "partner") {
  q = adminDb
    .collection("bookings")
    .where("partnerId", "==", uid)
    .orderBy("createdAt", "desc");
} else {
  q = adminDb
    .collection("bookings")
    .where("userId", "==", uid)
    .orderBy("createdAt", "desc");
}

const snap = await q.get();

return NextResponse.json({
  success: true,
  bookings: snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })),
});

},
{ requireAuth: true }
);

/* ---------------------------------------------------------
POST — Create Booking
--------------------------------------------------------- */

export const POST = withAuth(
async (req, ctx) => {

const { adminDb, decoded } = ctx;

if (!decoded) {
  return NextResponse.json(
    { success: false, error: "Not authenticated" },
    { status: 401 }
  );
}

const userId = decoded.uid;

const body = await req.json().catch(() => ({}));

const {
  listingId,
  checkIn,
  checkOut,
  paymentMode = "razorpay",
} = body;

if (!listingId || !checkIn || !checkOut) {
  return NextResponse.json(
    { success: false, error: "Missing required fields" },
    { status: 400 }
  );
}

const start = new Date(checkIn);
const end = new Date(checkOut);

if (end <= start) {
  return NextResponse.json(
    { success: false, error: "Invalid booking dates" },
    { status: 400 }
  );
}

const nights = Math.ceil(
  (end.getTime() - start.getTime()) / 86400000
);

if (nights <= 0) {
  return NextResponse.json(
    { success: false, error: "Minimum 1 night booking required" },
    { status: 400 }
  );
}

const result = await adminDb.runTransaction(async (tx) => {

  const listingRef = adminDb.collection("listings").doc(listingId);
  const listingSnap = await tx.get(listingRef);

  if (!listingSnap.exists) {
    throw new Error("Listing not found");
  }

  const listing = listingSnap.data();

  if (!listing.isActive) {
    throw new Error("Listing unavailable");
  }

  const ownerId = listing.ownerId || listing.partnerId || null;

  const ownerType =
    listing.ownerType || (listing.partnerId ? "partner" : "admin");

  const partnerId = listing.partnerId || null;

  const price = Number(listing.price || 0);

  if (!price) {
    throw new Error("Listing price missing");
  }

  const allowPayAtHotel = listing.allowPayAtHotel ?? false;

  /* CHECK EXISTING BOOKINGS */

  const existingBookings = await adminDb
    .collection("bookings")
    .where("listingId", "==", listingId)
    .where("status", "in", ["confirmed", "confirmed_unpaid"])
    .get();

  for (const doc of existingBookings.docs) {

    const b = doc.data();

    const bookedStart = new Date(b.checkIn);
    const bookedEnd = new Date(b.checkOut);

    if (start <= bookedEnd && end >= bookedStart) {
      throw new Error("Selected dates already booked");
    }

  }

  const amount = nights * price;

  const commission = Number((amount * COMMISSION_RATE).toFixed(2));
  const partnerPayout = Number((amount - commission).toFixed(2));

  let bookingStatus = "pending_payment";
  let paymentStatus = "pending";

  if (paymentMode === "pay_at_hotel") {

    if (!allowPayAtHotel) {
      throw new Error("Pay-at-hotel not allowed");
    }

    bookingStatus = "confirmed_unpaid";
    paymentStatus = "unpaid";

  }

  const bookingRef = adminDb.collection("bookings").doc();

  tx.set(bookingRef, {

    userId,
    userEmail: decoded.email || null,

    listingId,

    ownerId,
    ownerType,

    partnerId,

    checkIn,
    checkOut,
    nights,

    pricePerNight: price,

    amount,
    commission,
    partnerPayout,

    paymentMode,
    paymentStatus,

    status: bookingStatus,

    refundStatus: "none",

    checkedIn: false,
    checkedOut: false,

    razorpayOrderId: null,
    razorpayPaymentId: null,

    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),

  });

  return {
    bookingId: bookingRef.id,
    amount,
    paymentMode,
  };

});

return NextResponse.json({
  success: true,
  bookingId: result.bookingId,
  amount: result.amount,
  paymentMode: result.paymentMode,
});

},
{ requireAuth: true }
);

/* ---------------------------------------------------------
PUT — Update Booking
--------------------------------------------------------- */

export const PUT = withAuth(
async (req, ctx) => {

const { adminDb, decoded } = ctx;

if (!decoded) {
  return NextResponse.json(
    { success: false, error: "Not authenticated" },
    { status: 401 }
  );
}

const role =
  decoded.role ||
  (decoded.admin ? "admin" : decoded.partner ? "partner" : "user");

if (!["admin", "partner"].includes(role)) {
  return NextResponse.json(
    { success: false, error: "Forbidden" },
    { status: 403 }
  );
}

const body = await req.json().catch(() => ({}));

const { bookingId, status, paymentStatus } = body;

if (!bookingId) {
  return NextResponse.json(
    { success: false, error: "bookingId required" },
    { status: 400 }
  );
}

const bookingRef = adminDb.collection("bookings").doc(bookingId);
const bookingSnap = await bookingRef.get();

if (!bookingSnap.exists) {
  return NextResponse.json(
    { success: false, error: "Booking not found" },
    { status: 404 }
  );
}

const booking = bookingSnap.data();

if (role === "partner" && booking.partnerId !== decoded.uid) {
  return NextResponse.json(
    { success: false, error: "Unauthorized booking access" },
    { status: 403 }
  );
}

const updates: any = {
  updatedAt: FieldValue.serverTimestamp(),
};

if (status) updates.status = status;

if (paymentStatus) updates.paymentStatus = paymentStatus;

await bookingRef.update(updates);

return NextResponse.json({
  success: true,
  updates,
});

},
{ requireAuth: true }
);
