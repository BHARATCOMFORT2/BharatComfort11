export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/universal-wrapper";
import { FieldValue } from "firebase-admin/firestore";

/* ---------------------------------------------------------
   GET — Fetch Bookings
--------------------------------------------------------- */
export const GET = withAuth(
  async (req, ctx) => {
    const { adminDb, decoded } = ctx;
    const uid = decoded?.uid;

    const role =
      decoded?.role ||
      (decoded.admin ? "admin" : decoded.partner ? "partner" : "user");

    let q;

    if (role === "admin") {
      q = adminDb
        .collection("bookings")
        .where("status", "!=", "pending_payment")
        .orderBy("status")
        .orderBy("createdAt", "desc");
    } else if (role === "partner") {
      q = adminDb
        .collection("bookings")
        .where("partnerId", "==", uid)
        .where("status", "!=", "pending_payment")
        .orderBy("status")
        .orderBy("createdAt", "desc");
    } else {
      q = adminDb
        .collection("bookings")
        .where("userId", "==", uid)
        .where("status", "!=", "pending_payment")
        .orderBy("status")
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
  { requireRole: ["user", "partner", "admin"] }
);

/* ---------------------------------------------------------
   POST — Create Booking
--------------------------------------------------------- */
export const POST = withAuth(
  async (req, ctx) => {
    const { adminDb, decoded } = ctx;
    const userId = decoded.uid;

    const body = await req.json().catch(() => ({}));

    const {
      listingId,
      checkIn,
      checkOut,
      paymentMode = "razorpay", // razorpay | pay_at_hotel
    } = body;

    if (!listingId || !checkIn || !checkOut) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    /* ---------------------------------------------------------
       1️⃣ Validate Listing
    --------------------------------------------------------- */

    const listingSnap = await adminDb
      .collection("listings")
      .doc(listingId)
      .get();

    if (!listingSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Listing not found" },
        { status: 404 }
      );
    }

    const listing = listingSnap.data();

    const partnerId = listing.partnerId;
    const amount = Number(listing.price || listing.amount || 0);
    const allowPayAtHotel = listing.allowPayAtHotel ?? false;

    if (!partnerId || !amount) {
      return NextResponse.json(
        { success: false, error: "Invalid listing configuration" },
        { status: 500 }
      );
    }

    /* ---------------------------------------------------------
       2️⃣ Determine booking status
    --------------------------------------------------------- */

    let bookingStatus = "pending_payment";
    let paymentStatus = "pending";

    if (paymentMode === "pay_at_hotel") {
      if (!allowPayAtHotel) {
        return NextResponse.json(
          { success: false, error: "Pay-at-hotel not allowed" },
          { status: 403 }
        );
      }

      bookingStatus = "confirmed_unpaid";
      paymentStatus = "unpaid";
    }

    const now = FieldValue.serverTimestamp();

    /* ---------------------------------------------------------
       3️⃣ Create Booking
    --------------------------------------------------------- */

    const bookingData = {
      userId,
      userEmail: decoded?.email || null,

      partnerId,
      listingId,

      amount,

      checkIn,
      checkOut,

      paymentMode,

      paymentStatus, // pending | unpaid | paid
      status: bookingStatus, // pending_payment | confirmed_unpaid | confirmed

      refundStatus: "none",

      createdAt: now,
      updatedAt: now,
    };

    const bookingRef = await adminDb
      .collection("bookings")
      .add(bookingData);

    return NextResponse.json({
      success: true,
      bookingId: bookingRef.id,
      paymentMode,
      message:
        paymentMode === "pay_at_hotel"
          ? "Booking confirmed (Pay at Hotel)"
          : "Booking created. Awaiting payment.",
    });
  },
  { requireRole: ["user", "partner", "admin"] }
);

/* ---------------------------------------------------------
   PUT — Update Booking (Admin / Partner)
--------------------------------------------------------- */
export const PUT = withAuth(
  async (req, ctx) => {
    const { adminDb, decoded } = ctx;

    const role =
      decoded?.role ||
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

    const updates: any = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (status) updates.status = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;

    await adminDb
      .collection("bookings")
      .doc(bookingId)
      .update(updates);

    return NextResponse.json({
      success: true,
      updates,
    });
  },
  { requireRole: ["admin", "partner"] }
);
